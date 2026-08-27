import amqp, { type ConfirmChannel, type ChannelModel } from 'amqplib';
import { randomUUID } from 'node:crypto';
import type { Loop } from '@/notifications/runtime.js';
import type { DeliveryChannel, DeliveryRepository, PublishingDelivery } from '@/notifications/repositories.js';
import {
  deliveryHeaders,
  DELIVERY_ROUTING_KEYS,
  serializeDeliveryJob,
} from '@/notifications/rabbitmq-contract.js';
import type { RabbitMqConfig } from '@/notifications/rabbitmq-config.js';
import { configureRabbitTopology } from '@/notifications/rabbitmq-topology.js';

const PUBLISH_RETRY_DELAY_MS = 30_000;

function leaseOwner(prefix: 'pub' | 'con', instanceId: string) {
  return `${prefix}:${instanceId}:${randomUUID()}`;
}

function immediate() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

export async function publishWithConfirm(
  channel: ConfirmChannel,
  exchange: string,
  routingKey: string,
  body: Buffer,
  headers: Record<string, string>,
): Promise<void> {
  let returned = false;
  const onReturn = (message: { content: Buffer }) => {
    try {
      const parsed = JSON.parse(message.content.toString('utf8')) as {
        deliveryId?: string;
      };
      if (parsed.deliveryId) returned = true;
    } catch {
      returned = true;
    }
  };
  channel.on('return', onReturn);
  try {
    await new Promise<void>((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        body,
        {
          contentType: 'application/json',
          persistent: true,
          mandatory: true,
          headers,
        },
        (error?: Error | null) => (error ? reject(error) : resolve()),
      );
    });
    await immediate();
    if (returned) throw new Error('RABBITMQ_BASIC_RETURN');
  } finally {
    channel.off('return', onReturn);
  }
}

export class DeliveryJobPublisher {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly config: RabbitMqConfig,
    private readonly channelName: DeliveryChannel,
    private readonly instanceId: string,
  ) {}

  async runOnce(channel: ConfirmChannel) {
    const now = new Date();
    await this.repository.reclaimStaleProcessing(
      this.channelName,
      new Date(now.getTime() - this.config.consumerLeaseTimeoutMs),
      this.config.batchSize,
    );
    const claims = await this.repository.claimForPublishing({
      workerId: leaseOwner('pub', this.instanceId),
      channel: this.channelName,
      limit: this.config.batchSize,
      leaseTimeoutMs: this.config.publishLeaseTimeoutMs,
    });
    for (const claim of claims) await this.publishClaim(channel, claim);
  }

  private async publishClaim(
    channel: ConfirmChannel,
    claim: PublishingDelivery,
  ) {
    let leaseLost = false;
    let heartbeat: NodeJS.Timeout | undefined;
    const stopHeartbeat = () => {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = undefined;
    };
    const beat = async () => {
      if (leaseLost) return;
      const beatNow = new Date();
      try {
        const owned = await this.repository.heartbeatPublishing({
          deliveryId: claim.id,
          publishLease: claim.publishLease,
          now: beatNow,
          leaseDeadline: new Date(
            beatNow.getTime() + this.config.publishLeaseTimeoutMs,
          ),
        });
        if (!owned) {
          leaseLost = true;
          stopHeartbeat();
        }
      } catch {
        leaseLost = true;
        stopHeartbeat();
      }
    };
    heartbeat = setInterval(() => void beat(), this.config.publishHeartbeatIntervalMs);
    try {
      const job = {
        schemaVersion: 1 as const,
        deliveryId: claim.id.toString(),
        eventId: claim.eventId,
        channel: claim.channel,
        publishLease: claim.publishLease,
      };
      await publishWithConfirm(
        channel,
        this.config.exchange,
        DELIVERY_ROUTING_KEYS[claim.channel],
        serializeDeliveryJob(job),
        deliveryHeaders(claim.eventId, claim.correlationIdSnapshot),
      );
      if (!leaseLost) {
        await beat();
        if (!leaseLost) return;
        await this.repository.readDeliveryState(claim.id);
      }
    } catch (error) {
      if (!leaseLost)
        await this.repository.releasePublishing(
          claim,
          String(error instanceof Error ? error.message : error).slice(0, 2000),
          new Date(Date.now() + PUBLISH_RETRY_DELAY_MS),
        );
    } finally {
      stopHeartbeat();
    }
  }
}

export class DeliveryJobPublisherLoop implements Loop {
  private stopping = false;
  private connecting = false;
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly running = new Set<Promise<void>>();
  private startPromise: Promise<void> | null = null;
  private readonly publisher: DeliveryJobPublisher;

  constructor(
    repository: DeliveryRepository,
    private readonly config: RabbitMqConfig,
    channelName: DeliveryChannel,
    private readonly instanceId: string,
  ) {
    this.publisher = new DeliveryJobPublisher(
      repository,
      config,
      channelName,
      instanceId,
    );
  }

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
    if (this.startPromise) await this.startPromise.catch(() => undefined);
    await Promise.allSettled([...this.running]);
  }

  async close() {
    this.stopClaiming();
    await this.drain();
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
  }

  async runOnce() {
    if (this.stopping) return;
    if (!this.channel) {
      await this.open();
      return;
    }
    await this.publisher.runOnce(this.channel);
  }

  private schedule(delay: number) {
    if (this.stopping) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.stopping) return;
      const work = this.runOnce()
        .catch((error) =>
          console.error(
            JSON.stringify({
              component: 'DeliveryJobPublisherLoop',
              error: String(error instanceof Error ? error.message : error).slice(
                0,
                2000,
              ),
            }),
          ),
        )
        .finally(() => {
          this.running.delete(work);
          this.schedule(this.config.pollIntervalMs);
        });
      this.running.add(work);
    }, delay);
    timer.unref();
    this.timers.add(timer);
  }

  private async open() {
    if (this.connecting || this.channel || this.stopping) return;
    this.connecting = true;
    this.startPromise = (async () => {
      try {
        this.connection = await amqp.connect(this.config.url);
        this.channel = await this.connection.createConfirmChannel();
        await configureRabbitTopology(this.channel, this.config);
        this.connection.on('close', () => {
          this.channel = null;
          this.connection = null;
          if (!this.stopping) this.schedule(0);
        });
        this.connection.on('error', (error) => {
          console.error(
            JSON.stringify({
              component: 'DeliveryJobPublisherLoop',
              error: String(error instanceof Error ? error.message : error).slice(
                0,
                2000,
              ),
            }),
          );
        });
      } catch (error) {
        await this.channel?.close().catch(() => undefined);
        await this.connection?.close().catch(() => undefined);
        this.channel = null;
        this.connection = null;
        throw error;
      } finally {
        this.connecting = false;
      }
    })();
    await this.startPromise;
  }
}
