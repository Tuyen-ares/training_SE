import type {
  ClaimedDelivery,
  DeliveryChannel,
  DeliveryRepository,
} from '@/notifications/repositories.js';
import { RETRY_DELAYS_MS } from '@/notifications/repositories.js';

export type DeliveryOutcome =
  | { kind: 'SENT'; providerMessageId?: string; persisted?: boolean }
  | { kind: 'SKIPPED'; reason: string }
  | { kind: 'RETRY'; error: string }
  | { kind: 'FAILED'; error: string }
  | { kind: 'RELEASE_AND_ABORT'; error: string; cooldownMs: number };
export interface DeliveryHandler {
  readonly channel: DeliveryChannel;
  process(delivery: ClaimedDelivery): Promise<DeliveryOutcome>;
}
export class UnsupportedDeliveryChannelError extends Error {
  readonly permanent = true;
}

export class DeliveryHandlerRegistry {
  private readonly handlers = new Map<DeliveryChannel, DeliveryHandler>();
  constructor(handlers: readonly DeliveryHandler[] = []) {
    for (const handler of handlers) this.register(handler);
  }
  register(handler: DeliveryHandler) {
    if (this.handlers.has(handler.channel))
      throw new Error(`DUPLICATE_DELIVERY_HANDLER:${handler.channel}`);
    this.handlers.set(handler.channel, handler);
  }
  get(channel: DeliveryChannel) {
    const handler = this.handlers.get(channel);
    if (!handler)
      throw new UnsupportedDeliveryChannelError(
        `UNSUPPORTED_DELIVERY_CHANNEL:${channel}`,
      );
    return handler;
  }
}

export class DeliveryProcessor {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly registry: DeliveryHandlerRegistry,
    private readonly cleanError: (error: unknown) => string,
  ) {}
  async process(
    claim: ClaimedDelivery,
  ): Promise<{ abortBatch: boolean; cooldownMs?: number }> {
    if (!(await this.repository.isRecipientActive(claim.recipientUserId))) {
      await this.repository.skip(claim, 'USER_INACTIVE');
      return { abortBatch: false };
    }
    let outcome: DeliveryOutcome;
    try {
      outcome = await this.registry.get(claim.channel).process(claim);
    } catch (error) {
      outcome = { kind: 'RETRY', error: this.cleanError(error) };
    }
    if (outcome.kind === 'SENT') {
      if (!outcome.persisted)
        await this.repository.markSent(claim, outcome.providerMessageId);
      return { abortBatch: false };
    }
    if (outcome.kind === 'SKIPPED')
      await this.repository.skip(claim, outcome.reason);
    else if (outcome.kind === 'FAILED')
      await this.repository.fail(claim, outcome.error);
    else if (outcome.kind === 'RELEASE_AND_ABORT') {
      await this.repository.releasePending(claim, outcome.error);
      return { abortBatch: true, cooldownMs: outcome.cooldownMs };
    } else if (claim.attemptCount >= RETRY_DELAYS_MS.length)
      await this.repository.fail(claim, outcome.error);
    else
      await this.repository.retry(
        claim,
        outcome.error,
        new Date(Date.now() + RETRY_DELAYS_MS[claim.attemptCount]),
      );
    return { abortBatch: false };
  }
}

export class InAppDeliveryHandler implements DeliveryHandler {
  readonly channel = 'IN_APP' as const;
  constructor(private readonly repository: DeliveryRepository) {}
  async process(delivery: ClaimedDelivery): Promise<DeliveryOutcome> {
    const completed = await this.repository.completeInApp(delivery);
    return completed
      ? { kind: 'SENT', persisted: true }
      : { kind: 'FAILED', error: 'DELIVERY_LEASE_LOST' };
  }
}
