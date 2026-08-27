import os from 'node:os';
import type { PrismaClient } from '../../generated/prisma/index.js';
import {
  DomainEventWriter,
  createDomainEventDispatcher,
} from '@/notifications/domain-event.js';
import {
  DeliveryHandlerRegistry,
  DeliveryProcessor,
  InAppDeliveryHandler,
} from '@/notifications/delivery.js';
import { NotificationMaterializer } from '@/notifications/materializer.js';
import {
  PrismaDeliveryRepository,
  PrismaOutboxRepository,
  PrismaRecipientRepository,
} from '@/notifications/prisma-repositories.js';
import type {
  DeliveryRepository,
  OutboxRepository,
  RecipientRepository,
} from '@/notifications/repositories.js';
import {
  ConcurrencyLimiter,
  DeliveryLoop,
  NotificationRuntime,
  OutboxDispatchLoop,
  RetentionCleanupLoop,
} from '@/notifications/runtime.js';
import {
  NodemailerEmailProvider,
  SmtpEmailDeliveryHandler,
  readSmtpConfig,
} from '@/notifications/smtp.js';
import { NotificationTemplateCatalog } from '@/notifications/template-catalog.js';
import { RecipientResolver } from '@/notifications/recipient-resolver.js';
import { readRabbitMqConfig } from '@/notifications/rabbitmq-config.js';
import { DeliveryJobPublisherLoop } from '@/notifications/delivery-job-publisher.js';
import { DeliveryJobConsumer } from '@/notifications/delivery-job-consumer.js';
import { sanitizeError } from '@/notifications/runtime.js';

export const domainEventWriter = new DomainEventWriter();

function numberEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function limited<T extends object>(target: T, limiter: ConcurrencyLimiter): T {
  return new Proxy(target, {
    get(object, key, receiver) {
      const value = Reflect.get(object, key, receiver);
      return typeof value === 'function'
        ? (...args: unknown[]) => limiter.run(() => value.apply(object, args))
        : value;
    },
  });
}

export function createNotificationRuntime(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
) {
  const dbLimiter = new ConcurrencyLimiter(
    numberEnv(env.NOTIFICATION_WORKER_DB_CONCURRENCY, 3),
  );
  const outbox = limited<OutboxRepository>(
    new PrismaOutboxRepository(prisma),
    dbLimiter,
  );
  const recipients = limited<RecipientRepository>(
    new PrismaRecipientRepository(prisma),
    dbLimiter,
  );
  const deliveries = limited<DeliveryRepository>(
    new PrismaDeliveryRepository(prisma),
    dbLimiter,
  );
  const templates = new NotificationTemplateCatalog(
    env.EMAIL_BRAND_LOGO_URL?.trim() || null,
  );
  const materializer = new NotificationMaterializer(
    new RecipientResolver(recipients),
    templates,
    outbox,
    env.APP_PUBLIC_URL ?? '',
  );
  const smtp = readSmtpConfig(env);
  const provider =
    smtp.state === 'READY' ? new NodemailerEmailProvider(smtp.config) : null;
  const registry = new DeliveryHandlerRegistry([
    new InAppDeliveryHandler(deliveries),
    new SmtpEmailDeliveryHandler(
      provider,
      smtp.state !== 'DISABLED',
      sanitizeError,
      templates,
    ),
  ]);
  const processor = new DeliveryProcessor(deliveries, registry, sanitizeError);
  const workerId = os.hostname() + '-' + process.pid;
  const interval = numberEnv(env.NOTIFICATION_POLL_INTERVAL_MS, 2000);
  const batch = numberEnv(env.DELIVERY_BATCH_SIZE, 50);
  const lock = numberEnv(env.NOTIFICATION_LOCK_TIMEOUT_MS, 300000);
  const loops: any[] = [
    new OutboxDispatchLoop(
      outbox,
      createDomainEventDispatcher(),
      materializer,
      workerId,
      interval,
      numberEnv(env.OUTBOX_BATCH_SIZE, 20),
      lock,
      numberEnv(env.OUTBOX_CONCURRENCY, 3),
    ),
  ];
  const rabbit = readRabbitMqConfig(env);
  const rabbitResources: Array<{ close(): Promise<void> }> = [];
  if (rabbit.state === 'DISABLED') {
    loops.push(
      new DeliveryLoop(
        deliveries,
        processor,
        'IN_APP',
        workerId,
        interval,
        batch,
        lock,
        numberEnv(env.IN_APP_CONCURRENCY, 5),
      ),
    );
    if (smtp.state !== 'MISCONFIGURED')
      loops.push(
        new DeliveryLoop(
          deliveries,
          processor,
          'EMAIL',
          workerId,
          interval,
          batch,
          lock,
          numberEnv(env.EMAIL_CONCURRENCY, 10),
        ),
      );
  } else if (rabbit.state === 'READY') {
    for (const channel of rabbit.config.enabledChannels) {
      const publisher = new DeliveryJobPublisherLoop(
        deliveries,
        rabbit.config,
        channel,
        workerId,
      );
      const consumer = new DeliveryJobConsumer(
        deliveries,
        processor,
        rabbit.config,
        channel,
        workerId,
      );
      loops.push(publisher, consumer);
      rabbitResources.push(publisher, consumer);
    }
  } else {
    console.error(
      JSON.stringify({
        component: 'NotificationRuntime',
        error: rabbit.error,
        action: 'RABBITMQ_DISABLED_MISCONFIGURED',
      }),
    );
  }
  if (smtp.state === 'MISCONFIGURED')
    console.error(
      JSON.stringify({
        component: 'NotificationRuntime',
        channel: 'EMAIL',
        error: smtp.error,
        action: 'EMAIL_LOOP_DISABLED',
      }),
    );
  if (env.NOTIFICATION_CLEANUP_ENABLED !== 'false')
    loops.push(new RetentionCleanupLoop(outbox, deliveries, 86400000, 500));
  return new NotificationRuntime(loops, async () => {
    for (const resource of rabbitResources) await resource.close();
    await provider?.close();
  });
}
