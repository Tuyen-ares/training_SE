import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import {
  deliveryHeaders,
  parseDeliveryId,
  parseDeliveryJob,
  serializeDeliveryJob,
} from '@/notifications/rabbitmq-contract.js';
import { readRabbitMqConfig } from '@/notifications/rabbitmq-config.js';
import { publishWithConfirm } from '@/notifications/delivery-job-publisher.js';

const validJob = {
  schemaVersion: 1 as const,
  deliveryId: '274',
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  channel: 'EMAIL' as const,
  publishLease: 'pub:test:token',
};

test('validates deliveryId before converting to BigInt', () => {
  assert.throws(
    () => parseDeliveryId('1.5'),
    /positive decimal string/,
  );
  assert.throws(() => parseDeliveryId('0'), /positive decimal string/);
  assert.equal(
    parseDeliveryId('999999999999999999999999999999999999').toString(),
    '999999999999999999999999999999999999',
  );
});

test('DeliveryJobV1 has no outbound message id or content encoding', () => {
  const parsed = parseDeliveryJob(validJob);
  const body = JSON.parse(serializeDeliveryJob(parsed).toString('utf8'));
  assert.equal('outboundMessageId' in body, false);
  assert.deepEqual(deliveryHeaders(validJob.eventId, null), {
    'x-event-id': validJob.eventId,
  });
});

test('malformed delivery ids never reach BigInt conversion', () => {
  for (const value of ['1.5', '01', '0x10', '-1', '']) {
    assert.throws(() => parseDeliveryId(value), /positive decimal string/);
  }
});

test('Rabbit config rejects a heartbeat interval above one third of lease', () => {
  const result = readRabbitMqConfig({
    RABBITMQ_ENABLED: 'true',
    RABBITMQ_URL: 'amqp://localhost',
    RABBITMQ_PUBLISH_LEASE_TIMEOUT_MS: '30000',
    RABBITMQ_PUBLISH_HEARTBEAT_INTERVAL_MS: '10001',
  });
  assert.deepEqual(result, {
    state: 'MISCONFIGURED',
    error: 'RABBITMQ_PUBLISH_HEARTBEAT_TOO_LONG',
  });
});

test('Rabbit config is disabled without enabling the feature', () => {
  assert.deepEqual(readRabbitMqConfig({}), { state: 'DISABLED' });
});

class FakeConfirmChannel extends EventEmitter {
  options: Record<string, unknown> | undefined;
  publish(
    _exchange: string,
    _routingKey: string,
    _body: Buffer,
    options: Record<string, unknown>,
    callback: (error?: Error | null) => void,
  ) {
    this.options = options;
    callback(null);
    return true;
  }
}

test('publisher confirm uses JSON content type and no contentEncoding', async () => {
  const channel = new FakeConfirmChannel();
  await publishWithConfirm(
    channel as never,
    'exchange',
    'notification.email.delivery',
    Buffer.from('{}'),
    { 'x-event-id': validJob.eventId },
  );
  assert.equal(channel.options?.contentType, 'application/json');
  assert.equal('contentEncoding' in (channel.options ?? {}), false);
});

test('publisher treats basic.return as a publish failure', async () => {
  class ReturningChannel extends FakeConfirmChannel {
    override publish(
      exchange: string,
      routingKey: string,
      body: Buffer,
      options: Record<string, unknown>,
      callback: (error?: Error | null) => void,
    ) {
      const result = super.publish(
        exchange,
        routingKey,
        body,
        options,
        callback,
      );
      this.emit('return', { content: body });
      return result;
    }
  }
  await assert.rejects(
    publishWithConfirm(
      new ReturningChannel() as never,
      'exchange',
      'notification.email.delivery',
      Buffer.from(JSON.stringify(validJob)),
      {},
    ),
    /RABBITMQ_BASIC_RETURN/,
  );
});
