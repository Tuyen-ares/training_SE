import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import amqp, { type Channel, type ConfirmChannel } from 'amqplib';
import { configureRabbitTopology } from '@/notifications/rabbitmq-topology.js';
import { publishWithConfirm } from '@/notifications/delivery-job-publisher.js';
import type { RabbitMqConfig } from '@/notifications/rabbitmq-config.js';

const url = process.env.RABBITMQ_TEST_URL?.trim() ?? process.env.RABBITMQ_URL?.trim();

function testConfig(connectionUrl: string): RabbitMqConfig {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  return {
    url: connectionUrl,
    exchange: `bigin.test.notification-deliveries.${suffix}`,
    exchangeType: 'topic',
    deadLetterExchange: `bigin.test.dead-letter.${suffix}`,
    deadLetterExchangeType: 'direct',
    publishLeaseTimeoutMs: 30_000,
    publishHeartbeatIntervalMs: 5_000,
    consumerLeaseTimeoutMs: 60_000,
    pollIntervalMs: 100,
    batchSize: 10,
    enabledChannels: ['EMAIL'],
    channels: {
      IN_APP: {
        queue: `bigin.test.in-app.${suffix}`,
        bindingKey: 'notification.in_app.delivery',
        prefetch: 1,
        deadLetterQueue: `bigin.test.in-app.dlq.${suffix}`,
        deadLetterRoutingKey: 'notification.in_app.failed',
        deadLetterBindingKey: 'notification.in_app.failed',
      },
      EMAIL: {
        queue: `bigin.test.email.${suffix}`,
        bindingKey: 'notification.email.delivery',
        prefetch: 1,
        deadLetterQueue: `bigin.test.email.dlq.${suffix}`,
        deadLetterRoutingKey: 'notification.email.failed',
        deadLetterBindingKey: 'notification.email.failed',
      },
    },
  };
}

function withTimeout<T>(promise: Promise<T>, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('RABBITMQ_TEST_TIMEOUT:' + label)),
      10_000,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function receive(channel: Channel, queue: string) {
  return withTimeout(
    (async () => {
      while (true) {
        const message = await channel.get(queue, { noAck: false });
        if (message) return message;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    })(),
    'get ' + queue,
  );
}
test(
  'Rabbit topology routes confirmed deliveries and dead-letters rejected messages',
  { skip: !url },
  async () => {
    const config = testConfig(url as string);
    const connection = await amqp.connect(config.url);
    const publisher = await connection.createConfirmChannel();
    const consumer = await connection.createChannel();
    const deadLetterConsumer = await connection.createChannel();
    try {
      await configureRabbitTopology(publisher, config);
      await consumer.prefetch(1);
      await deadLetterConsumer.prefetch(1);

      const validBody = Buffer.from(
        JSON.stringify({ schemaVersion: 1, deliveryId: '274' }),
      );
      const delivered = receive(consumer, config.channels.EMAIL.queue);
      await withTimeout(
        publishWithConfirm(
          publisher,
          config.exchange,
          config.channels.EMAIL.bindingKey,
          validBody,
          { 'x-event-id': '550e8400-e29b-41d4-a716-446655440000' },
        ),
        'publish',
      );
      const routed = await delivered;
      assert.deepEqual(routed.content, validBody);
      consumer.ack(routed);

      await assert.rejects(
        publishWithConfirm(
          publisher,
          config.exchange,
          'notification.email.unknown',
          validBody,
          {},
        ),
        /RABBITMQ_BASIC_RETURN/,
      );

      const deadLettered = receive(
        deadLetterConsumer,
        config.channels.EMAIL.deadLetterQueue,
      );
      const poison = receive(consumer, config.channels.EMAIL.queue);
      await withTimeout(
        publishWithConfirm(
          publisher,
          config.exchange,
          config.channels.EMAIL.bindingKey,
          Buffer.from('{"deliveryId":"not-a-decimal"}'),
          {},
        ),
        'publish',
      );
      consumer.nack(await poison, false, false);
      const dead = await deadLettered;
      assert.match(dead.content.toString('utf8'), /not-a-decimal/);
      deadLetterConsumer.ack(dead);
    } finally {
      for (const channelConfig of Object.values(config.channels)) {
        await consumer.deleteQueue(channelConfig.queue).catch(() => undefined);
        await consumer.deleteQueue(channelConfig.deadLetterQueue).catch(() => undefined);
      }
      await publisher.deleteExchange(config.exchange).catch(() => undefined);
      await publisher.deleteExchange(config.deadLetterExchange).catch(() => undefined);
      await publisher.close().catch(() => undefined);
      await consumer.close().catch(() => undefined);
      await deadLetterConsumer.close().catch(() => undefined);
      await connection.close().catch(() => undefined);
    }
  },
);
