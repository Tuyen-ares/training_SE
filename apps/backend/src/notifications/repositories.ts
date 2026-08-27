import type {
  DomainEvent,
  NotificationIntent,
  PersistedOutboxEvent,
} from '@/notifications/domain-event.js';

export const RETRY_DELAYS_MS = [
  0, 30_000, 120_000, 600_000, 1_800_000, 7_200_000,
] as const;

export type DeliveryChannel = 'IN_APP' | 'EMAIL';

export interface ClaimedOutbox extends PersistedOutboxEvent {
  id: bigint;
  dispatch_attempt_count: number;
  locked_by: string;
}

export interface ResolvedRecipient {
  userId: number;
  email: string | null;
  active: boolean;
}

export interface MaterializedDelivery {
  recipient: ResolvedRecipient;
  intent: NotificationIntent;
  title: string;
  text: string;
  eventType: string;
  templateVersion: number;
  messagePayload: Record<string, unknown>;
}

export type DeliveryStatus =
  | 'PENDING'
  | 'PUBLISHING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'SKIPPED';

export interface ClaimedDelivery {
  id: bigint;
  eventId: string;
  correlationIdSnapshot: string | null;
  recipientUserId: number;
  channel: DeliveryChannel;
  recipientAddress: string | null;
  notificationId: number | null;
  messageId?: bigint | null;
  eventType?: string | null;
  templateVersion?: number | null;
  messagePayload?: unknown;
  notificationType: string;
  title: string;
  text: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  outboundMessageId: string | null;
  attemptCount: number;
  leaseOwner: string;
}

export interface PublishingDelivery extends ClaimedDelivery {
  publishLease: string;
}

export interface DeliveryState {
  id: bigint;
  status: DeliveryStatus;
  lockedBy: string | null;
}

export interface OutboxRepository {
  claimDue(input: {
    workerId: string;
    limit: number;
    staleBefore: Date;
  }): Promise<ClaimedOutbox[]>;
  finalizeDispatch(
    claim: ClaimedOutbox,
    event: DomainEvent,
    deliveries: readonly MaterializedDelivery[],
  ): Promise<boolean>;
  release(
    claim: ClaimedOutbox,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean>;
  fail(claim: ClaimedOutbox, error: string): Promise<boolean>;
  cleanup(before: Date, limit: number): Promise<number>;
}

export interface RecipientRepository {
  findDirect(userId: number): Promise<ResolvedRecipient | null>;
  findActiveByPermissions(
    codes: readonly string[],
    excluded: readonly number[],
  ): Promise<ResolvedRecipient[]>;
}

export interface DeliveryRepository {
  claimDue(input: {
    workerId: string;
    channel: DeliveryChannel;
    limit: number;
    staleBefore: Date;
  }): Promise<ClaimedDelivery[]>;
  claimForPublishing(input: {
    workerId: string;
    channel: DeliveryChannel;
    limit: number;
    leaseTimeoutMs: number;
  }): Promise<PublishingDelivery[]>;
  reclaimStaleProcessing(
    channel: DeliveryChannel,
    staleBefore: Date,
    limit: number,
  ): Promise<number>;
  heartbeatPublishing(input: {
    deliveryId: bigint;
    publishLease: string;
    now: Date;
    leaseDeadline: Date;
  }): Promise<boolean>;
  releasePublishing(
    claim: PublishingDelivery,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean>;
  readDeliveryState(id: bigint): Promise<DeliveryState | null>;
  claimPublished(input: {
    deliveryId: bigint;
    eventId: string;
    channel: DeliveryChannel;
    publishLease: string;
    consumerLease: string;
  }): Promise<ClaimedDelivery | null>;
  heartbeatProcessing(input: {
    deliveryId: bigint;
    consumerLease: string;
    now: Date;
  }): Promise<boolean>;
  isRecipientActive(userId: number): Promise<boolean>;
  completeInApp(claim: ClaimedDelivery): Promise<boolean>;
  markSent(
    claim: ClaimedDelivery,
    providerMessageId?: string,
  ): Promise<boolean>;
  retry(
    claim: ClaimedDelivery,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean>;
  fail(claim: ClaimedDelivery, error: string): Promise<boolean>;
  skip(claim: ClaimedDelivery, reason: string): Promise<boolean>;
  releasePending(claim: ClaimedDelivery, error: string): Promise<boolean>;
  cleanup(before: Date, limit: number): Promise<number>;
}
