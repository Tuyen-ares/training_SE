import {
  parseOutboxDomainEvent,
  PermanentDomainEventError,
  type DomainEventDispatcher,
} from '@/notifications/domain-event.js';
import type {
  DeliveryChannel,
  DeliveryRepository,
  OutboxRepository,
} from '@/notifications/repositories.js';
import { RETRY_DELAYS_MS } from '@/notifications/repositories.js';
import type { NotificationMaterializer } from '@/notifications/materializer.js';
import type { DeliveryProcessor } from '@/notifications/delivery.js';

export const sanitizeError = (error: unknown) =>
  String(error instanceof Error ? error.message : error)
    .replace(/\b(authorization\s*[:=]\s*)?(bearer|basic)\s+[^\s,;]+/gi, (_match, prefix, scheme) =>
      `${prefix ?? ''}${scheme} [REDACTED]`,
    )
    .replace(
      /\b(password|passwd|token|secret|api[-_]?key)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      '$1$2[REDACTED]',
    )
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/gi, '$1[REDACTED]:[REDACTED]@')
    .slice(0, 2000);
export class ConcurrencyLimiter {
  private active = 0;
  private readonly queue: Array<() => void> = [];
  constructor(readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1)
      throw new Error('INVALID_CONCURRENCY_LIMIT');
  }
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit)
      await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
  get activeCount() {
    return this.active;
  }
}
async function runBounded<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<boolean | void>,
) {
  let cursor = 0,
    aborted = false;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (!aborted) {
        const index = cursor++;
        if (index >= items.length) return;
        aborted = (await task(items[index])) === true;
      }
    }),
  );
  return aborted;
}

export interface Loop {
  start(): void;
  stopClaiming(): void;
  drain(): Promise<void>;
  runOnce(): Promise<void>;
}
abstract class RecursiveLoop implements Loop {
  protected stopping = false;
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly running = new Set<Promise<void>>();
  constructor(private readonly intervalMs: number) {}
  start() {
    this.stopping = false;
    this.schedule(0);
  }
  stopClaiming() {
    this.stopping = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
  async drain() {
    await Promise.allSettled([...this.running]);
  }
  abstract runOnce(): Promise<void>;
  protected schedule(delay = this.intervalMs) {
    if (this.stopping) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.stopping) return;
      const work = this.runOnce()
        .catch((error) =>
          console.error(
            JSON.stringify({
              component: this.constructor.name,
              error: sanitizeError(error),
            }),
          ),
        )
        .finally(() => {
          this.running.delete(work);
          this.schedule();
        });
      this.running.add(work);
    }, delay);
    timer.unref();
    this.timers.add(timer);
  }
  get timerCount() {
    return this.timers.size;
  }
}

export class OutboxDispatchLoop extends RecursiveLoop {
  constructor(
    private readonly repository: OutboxRepository,
    private readonly dispatcher: DomainEventDispatcher,
    private readonly materializer: NotificationMaterializer,
    private readonly workerId: string,
    intervalMs: number,
    private readonly batchSize: number,
    private readonly lockTimeoutMs: number,
    private readonly concurrency = 3,
  ) {
    super(intervalMs);
  }
  async runOnce() {
    if (this.stopping) return;
    const claims = await this.repository.claimDue({
      workerId: this.workerId,
      limit: this.batchSize,
      staleBefore: new Date(Date.now() - this.lockTimeoutMs),
    });
    await runBounded(claims, this.concurrency, async (claim) => {
      try {
        const event = parseOutboxDomainEvent(claim);
        const intents = await this.dispatcher.publish(event);
        await this.materializer.materialize(claim, event, intents);
      } catch (error) {
        const message = sanitizeError(error);
        const permanent =
          error instanceof PermanentDomainEventError ||
          (typeof error === 'object' && error !== null && 'permanent' in error);
        if (permanent || claim.dispatch_attempt_count >= RETRY_DELAYS_MS.length)
          await this.repository.fail(claim, message);
        else
          await this.repository.release(
            claim,
            message,
            new Date(
              Date.now() + RETRY_DELAYS_MS[claim.dispatch_attempt_count],
            ),
          );
      }
      return false;
    });
  }
}

export class DeliveryLoop extends RecursiveLoop {
  private cooldownUntil = 0;
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly processor: DeliveryProcessor,
    private readonly channel: DeliveryChannel,
    private readonly workerId: string,
    intervalMs: number,
    private readonly batchSize: number,
    private readonly lockTimeoutMs: number,
    private readonly concurrency: number,
  ) {
    super(intervalMs);
  }
  async runOnce() {
    if (this.stopping || Date.now() < this.cooldownUntil) return;
    const claims = await this.repository.claimDue({
      workerId: this.workerId,
      channel: this.channel,
      limit: this.batchSize,
      staleBefore: new Date(Date.now() - this.lockTimeoutMs),
    });
    await runBounded(claims, this.concurrency, async (claim) => {
      const result = await this.processor.process(claim);
      if (result.abortBatch) {
        this.cooldownUntil = Date.now() + (result.cooldownMs ?? 0);
        return true;
      }
      return false;
    });
  }
  get remainingCooldownMs() {
    return Math.max(0, this.cooldownUntil - Date.now());
  }
}

export class RetentionCleanupLoop extends RecursiveLoop {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly deliveries: DeliveryRepository,
    intervalMs = 86_400_000,
    private readonly batchSize = 500,
  ) {
    super(intervalMs);
  }
  async runOnce() {
    if (this.stopping) return;
    await this.deliveries.cleanup(
      new Date(Date.now() - 90 * 86_400_000),
      this.batchSize,
    );
    await this.outbox.cleanup(
      new Date(Date.now() - 7 * 86_400_000),
      this.batchSize,
    );
  }
}

export class NotificationRuntime {
  private started = false;
  constructor(
    private readonly loops: readonly Loop[],
    private readonly closeResources: () => Promise<void>,
  ) {}
  start(enabled = process.env.NOTIFICATION_WORKER_ENABLED === 'true') {
    if (!enabled || this.started) return;
    this.started = true;
    for (const loop of this.loops) loop.start();
  }
  async runOnce() {
    for (const loop of this.loops) await loop.runOnce();
  }
  beginShutdown() {
    for (const loop of this.loops) loop.stopClaiming();
  }
  async stop() {
    if (!this.started) {
      await this.closeResources();
      return;
    }
    this.beginShutdown();
    await Promise.all(this.loops.map((loop) => loop.drain()));
    await this.closeResources();
    this.started = false;
  }
}
