import type { Channel } from 'amqplib';
import type {
  RabbitChannelConfig,
  RabbitMqConfig,
} from '@/notifications/rabbitmq-config.js';
import type { DeliveryChannel } from '@/notifications/repositories.js';

export async function configureRabbitTopology(
  channel: Channel,
  config: RabbitMqConfig,
) {
  await channel.assertExchange(
    config.exchange,
    config.exchangeType,
    { durable: true },
  );
  await channel.assertExchange(
    config.deadLetterExchange,
    config.deadLetterExchangeType,
    { durable: true },
  );
  for (const logicalChannel of config.enabledChannels) {
    const channelConfig = config.channels[logicalChannel];
    await assertDeliveryQueue(
      channel,
      config,
      logicalChannel,
      channelConfig,
    );
  }
}

async function assertDeliveryQueue(
  channel: Channel,
  config: RabbitMqConfig,
  logicalChannel: DeliveryChannel,
  channelConfig: RabbitChannelConfig,
) {
  await channel.assertQueue(channelConfig.queue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': config.deadLetterExchange,
      'x-dead-letter-routing-key': channelConfig.deadLetterRoutingKey,
    },
  });
  await channel.bindQueue(
    channelConfig.queue,
    config.exchange,
    channelConfig.bindingKey,
  );
  await channel.assertQueue(channelConfig.deadLetterQueue, {
    durable: true,
  });
  await channel.bindQueue(
    channelConfig.deadLetterQueue,
    config.deadLetterExchange,
    channelConfig.deadLetterBindingKey,
  );
  void logicalChannel;
}
