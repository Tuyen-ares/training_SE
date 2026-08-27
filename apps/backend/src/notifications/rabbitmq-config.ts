import type { DeliveryChannel } from '@/notifications/repositories.js';

export type RabbitMqState = 'DISABLED' | 'MISCONFIGURED' | 'READY';

export interface RabbitChannelConfig {
  queue: string;
  bindingKey: string;
  prefetch: number;
  deadLetterQueue: string;
  deadLetterRoutingKey: string;
  deadLetterBindingKey: string;
}

export interface RabbitMqConfig {
  url: string;
  exchange: string;
  exchangeType: 'topic';
  deadLetterExchange: string;
  deadLetterExchangeType: 'direct';
  publishLeaseTimeoutMs: number;
  publishHeartbeatIntervalMs: number;
  consumerLeaseTimeoutMs: number;
  pollIntervalMs: number;
  batchSize: number;
  enabledChannels: readonly DeliveryChannel[];
  channels: Record<DeliveryChannel, RabbitChannelConfig>;
}

export type RabbitMqConfigResult =
  | { state: 'DISABLED' }
  | { state: 'MISCONFIGURED'; error: string }
  | { state: 'READY'; config: RabbitMqConfig };

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const required = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback;

function channelConfig(
  env: NodeJS.ProcessEnv,
  channel: DeliveryChannel,
  defaults: RabbitChannelConfig,
): RabbitChannelConfig {
  const prefix = channel === 'IN_APP' ? 'IN_APP' : 'EMAIL';
  return {
    queue: required(env[`RABBITMQ_${prefix}_QUEUE`], defaults.queue),
    bindingKey: required(
      env[`RABBITMQ_${prefix}_BINDING_KEY`],
      defaults.bindingKey,
    ),
    prefetch:
      positiveInteger(
        env[`RABBITMQ_${prefix}_PREFETCH`],
        defaults.prefetch,
      ) ?? defaults.prefetch,
    deadLetterQueue: required(
      env[`RABBITMQ_${prefix}_DLQ`],
      defaults.deadLetterQueue,
    ),
    deadLetterRoutingKey: required(
      env[`RABBITMQ_${prefix}_DEAD_LETTER_ROUTING_KEY`],
      defaults.deadLetterRoutingKey,
    ),
    deadLetterBindingKey: required(
      env[`RABBITMQ_${prefix}_DLQ_BINDING_KEY`],
      defaults.deadLetterBindingKey,
    ),
  };
}

export function readRabbitMqConfig(
  env: NodeJS.ProcessEnv = process.env,
): RabbitMqConfigResult {
  if (env.RABBITMQ_ENABLED !== 'true') return { state: 'DISABLED' };

  const url = env.RABBITMQ_URL?.trim();
  if (!url) return { state: 'MISCONFIGURED', error: 'RABBITMQ_URL_REQUIRED' };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'amqp:' && parsed.protocol !== 'amqps:')
      return { state: 'MISCONFIGURED', error: 'RABBITMQ_URL_PROTOCOL_INVALID' };
  } catch {
    return { state: 'MISCONFIGURED', error: 'RABBITMQ_URL_INVALID' };
  }

  const publishLeaseTimeoutMs = positiveInteger(
    env.RABBITMQ_PUBLISH_LEASE_TIMEOUT_MS,
    30_000,
  );
  const publishHeartbeatIntervalMs = positiveInteger(
    env.RABBITMQ_PUBLISH_HEARTBEAT_INTERVAL_MS,
    10_000,
  );
  const consumerLeaseTimeoutMs = positiveInteger(
    env.RABBITMQ_CONSUMER_LEASE_TIMEOUT_MS,
    300_000,
  );
  if (
    !publishLeaseTimeoutMs ||
    !publishHeartbeatIntervalMs ||
    !consumerLeaseTimeoutMs
  )
    return { state: 'MISCONFIGURED', error: 'RABBITMQ_LEASE_VALUE_INVALID' };
  if (
    publishHeartbeatIntervalMs >
    Math.floor(publishLeaseTimeoutMs / 3)
  )
    return {
      state: 'MISCONFIGURED',
      error: 'RABBITMQ_PUBLISH_HEARTBEAT_TOO_LONG',
    };

  const pollIntervalMs = positiveInteger(
    env.RABBITMQ_POLL_INTERVAL_MS,
    positiveInteger(env.NOTIFICATION_POLL_INTERVAL_MS, 2_000) ?? 2_000,
  );
  const batchSize = positiveInteger(
    env.RABBITMQ_BATCH_SIZE,
    positiveInteger(env.DELIVERY_BATCH_SIZE, 50) ?? 50,
  );
  if (!pollIntervalMs || !batchSize)
    return { state: 'MISCONFIGURED', error: 'RABBITMQ_RUNTIME_VALUE_INVALID' };

  const enabledChannels = (
    env.RABBITMQ_ENABLED_CHANNELS ?? 'IN_APP,EMAIL'
  )
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean) as DeliveryChannel[];
  const uniqueChannels = [...new Set(enabledChannels)];
  if (
    !uniqueChannels.length ||
    uniqueChannels.some((value) => value !== 'IN_APP' && value !== 'EMAIL')
  )
    return {
      state: 'MISCONFIGURED',
      error: 'RABBITMQ_CHANNELS_INVALID',
    };

  const exchange = required(
    env.RABBITMQ_DELIVERY_EXCHANGE,
    'bigin.notification-deliveries',
  );
  if ((env.RABBITMQ_DELIVERY_EXCHANGE_TYPE ?? 'topic') !== 'topic')
    return {
      state: 'MISCONFIGURED',
      error: 'RABBITMQ_DELIVERY_EXCHANGE_TYPE_INVALID',
    };
  const deadLetterExchange = required(
    env.RABBITMQ_DLX,
    'bigin.dead-letter',
  );
  if ((env.RABBITMQ_DLX_TYPE ?? 'direct') !== 'direct')
    return { state: 'MISCONFIGURED', error: 'RABBITMQ_DLX_TYPE_INVALID' };

  return {
    state: 'READY',
    config: {
      url,
      exchange,
      exchangeType: 'topic',
      deadLetterExchange,
      deadLetterExchangeType: 'direct',
      publishLeaseTimeoutMs,
      publishHeartbeatIntervalMs,
      consumerLeaseTimeoutMs,
      pollIntervalMs,
      batchSize,
      enabledChannels: uniqueChannels,
      channels: {
        IN_APP: channelConfig(env, 'IN_APP', {
          queue: 'bigin.notifications.in-app.v1',
          bindingKey: 'notification.in_app.delivery',
          prefetch: 20,
          deadLetterQueue: 'bigin.notifications.in-app.dlq.v1',
          deadLetterRoutingKey: 'notification.in_app.failed',
          deadLetterBindingKey: 'notification.in_app.failed',
        }),
        EMAIL: channelConfig(env, 'EMAIL', {
          queue: 'bigin.notifications.email.v1',
          bindingKey: 'notification.email.delivery',
          prefetch: 5,
          deadLetterQueue: 'bigin.notifications.email.dlq.v1',
          deadLetterRoutingKey: 'notification.email.failed',
          deadLetterBindingKey: 'notification.email.failed',
        }),
      },
    },
  };
}
