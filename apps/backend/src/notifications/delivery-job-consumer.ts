import amqp, {
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
} from 'amqplib';
import { randomUUID } from 'node:crypto';
import type { Loop } from '@/notifications/runtime.js';
import type {
  DeliveryChannel,
  DeliveryRepository,
} from '@/notifications/repositories.js';
import {
  InvalidDeliveryJobError,
  parseDeliveryId,
  parseDeliveryJob,
} from '@/notifications/rabbitmq-contract.js';
import type { RabbitMqConfig } from '@/notifications/rabbitmq-config.js';
import { configureRabbitTopology } from '@/notifications/rabbitmq-topology.js';
import type { DeliveryProcessor } from '@/notifications/delivery.js';

const leaseOwner = (instanceId: string) =>
  `con:${instanceId}:${randomUUID()}`;

export class DeliveryJobConsumer implements Loop {
  private stopping = false;
  private connecting = false;
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private consumerTag: string | null = null;
  private startPromise: Promise<void> | null = null;
  private readonly running = new Set<Promise<void>>();

  constructor(
    private readonly repository: DeliveryRepository,
    private readonly processor: DeliveryProcessor,
    private readonly config: RabbitMqConfig,
    private readonly channelName: DeliveryChannel,
    private readonly instanceId: string,
  ) {}

  start() {
    this.stopping = false;
    void this.open().catch((error) => {
      this.log(error);
      if (!this.stopping)
        setTimeout(
          () => void this.open().catch((retryError) => this.log(retryError)),
          this.config.pollIntervalMs,
        ).unref();
    });
  }

  stopClaiming() {
    this.stopping = true;
    if (this.channel && this.consumerTag)
      void this.channel.cancel(this.consumerTag).catch(() => undefined);
    this.consumerTag = null;
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
    // RabbitMQ pushes deliveries through basic.consume; there is no polling work.
  }

  private async open() {
    if (this.connecting || this.channel || this.stopping) return;
    this.connecting = true;
    this.startPromise = (async () => {
      try {
        this.connection = await amqp.connect(this.config.url);
        this.channel = await this.connection.createChannel();
        await configureRabbitTopology(this.channel, this.config);
        await this.channel.prefetch(
          this.config.channels[this.channelName].prefetch,
        );
        const result = await this.channel.consume(
          this.config.channels[this.channelName].queue,
          (message) => this.onMessage(message),
          { noAck: false },
        );
        this.consumerTag = result.consumerTag;
        this.connection.on('close', () => {
          this.channel = null;
          this.consumerTag = null;
          if (!this.stopping) void this.open().catch((error) => this.log(error));
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

  private onMessage(message: ConsumeMessage | null) {
    if (!message || this.stopping) return;
    const work = this.handleMessage(message)
      .catch((error) => this.log(error))
      .finally(() => this.running.delete(work));
    this.running.add(work);
  }

  private async handleMessage(message: ConsumeMessage) {
    const channel = this.channel;
    if (!channel) return;
    let job;
    let deliveryId: bigint;
    try {
      job = parseDeliveryJob(JSON.parse(message.content.toString('utf8')));
      if (job.channel !== this.channelName)
        throw new InvalidDeliveryJobError('DELIVERY_CHANNEL_MISMATCH');
      // Validate the decimal string before BigInt conversion. Invalid jobs
      // are poison messages and must be routed to the DLQ.
      deliveryId = parseDeliveryId(job.deliveryId);
    } catch {
      channel.nack(message, false, false);
      return;
    }
    const state = await this.repository.readDeliveryState(deliveryId);
    if (
      !state ||
      state.status === 'SENT' ||
      state.status === 'SKIPPED' ||
      state.status === 'FAILED'
    ) {
      channel.ack(message);
      return;
    }

    const consumerLease = leaseOwner(this.instanceId);
    const claim = await this.repository.claimPublished({
      deliveryId,
      eventId: job.eventId,
      channel: job.channel,
      publishLease: job.publishLease,
      consumerLease,
    });
    if (!claim) {
      channel.ack(message);
      return;
    }

    let heartbeat: NodeJS.Timeout | undefined;
    let heartbeatStopped = false;
    const beat = async () => {
      if (heartbeatStopped) return;
      const now = new Date();
      try {
        const owned = await this.repository.heartbeatProcessing({
          deliveryId,
          consumerLease,
          now,
        });
        if (!owned) {
          heartbeatStopped = true;
          if (heartbeat) clearInterval(heartbeat);
        }
      } catch {
        heartbeatStopped = true;
        if (heartbeat) clearInterval(heartbeat);
      }
    };
    heartbeat = setInterval(
      () => void beat(),
      Math.max(1, Math.floor(this.config.consumerLeaseTimeoutMs / 3)),
    );
    try {
      await this.processor.process(claim);
      channel.ack(message);
    } catch {
      channel.nack(message, false, true);
    } finally {
      heartbeatStopped = true;
      if (heartbeat) clearInterval(heartbeat);
    }
  }

  private log(error: unknown) {
    console.error(
      JSON.stringify({
        component: 'DeliveryJobConsumer',
        channel: this.channelName,
        error: String(error instanceof Error ? error.message : error).slice(
          0,
          2000,
        ),
      }),
    );
  }
}
