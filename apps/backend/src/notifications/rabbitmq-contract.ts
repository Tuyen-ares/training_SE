import { z } from 'zod';
import type { DeliveryChannel } from '@/notifications/repositories.js';

export const DELIVERY_ROUTING_KEYS: Record<DeliveryChannel, string> = {
  IN_APP: 'notification.in_app.delivery',
  EMAIL: 'notification.email.delivery',
};

const deliveryIdPattern = /^[1-9]\d*$/;

const deliveryJobSchema = z
  .object({
    schemaVersion: z.literal(1),
    deliveryId: z.string().regex(deliveryIdPattern),
    eventId: z.string().uuid(),
    channel: z.enum(['IN_APP', 'EMAIL']),
    publishLease: z.string().min(1).max(100),
  })
  .strict();

export type DeliveryJobV1 = z.infer<typeof deliveryJobSchema>;

export class InvalidDeliveryJobError extends Error {
  readonly permanent = true;
  constructor(message = 'INVALID_DELIVERY_JOB') {
    super(message);
    this.name = 'InvalidDeliveryJobError';
  }
}

export function parseDeliveryJob(input: unknown): DeliveryJobV1 {
  const result = deliveryJobSchema.safeParse(input);
  if (!result.success)
    throw new InvalidDeliveryJobError('INVALID_DELIVERY_JOB_SCHEMA');
  return result.data;
}

export function parseDeliveryId(value: string): bigint {
  if (!deliveryIdPattern.test(value))
    throw new InvalidDeliveryJobError(
      'deliveryId must be a positive decimal string',
    );
  return BigInt(value);
}

export function serializeDeliveryJob(job: DeliveryJobV1): Buffer {
  return Buffer.from(JSON.stringify(job), 'utf8');
}

export function deliveryHeaders(
  eventId: string,
  correlationId: string | null,
) {
  return {
    'x-event-id': eventId,
    ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
  };
}
