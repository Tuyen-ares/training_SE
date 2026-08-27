import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/index.js';

export const DOMAIN_EVENT_TYPES = [
  'borrow_request.created',
  'borrow_request.approval_summary',
  'borrow_request_detail.approved',
  'borrow_request_detail.rejected',
  'borrow_history.handed_over',
  'borrow_history.returned',
  'borrow_history.returned_damaged',
  'asset_issue.reported',
  'asset_issue.created_from_damaged_return',
  'asset_issue.confirmed',
  'asset_issue.rejected',
  'asset_issue.repair_started',
  'asset_issue.repair_completed',
  'asset_issue.repair_failed',
] as const;
export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];
export type AggregateType =
  | 'BORROW_REQUEST'
  | 'BORROW_REQUEST_DETAIL'
  | 'BORROW_HISTORY'
  | 'ASSET_ISSUE';

export interface DeepLinkContext {
  entityType: 'BORROW_REQUEST' | 'ASSET_ISSUE';
  entityId: number;
}

export interface BorrowApprovalItemSnapshot {
  detailId: number;
  assetId?: number;
  assetCode?: string;
  assetModelName?: string;
  expectedReturnDate?: string;
  outcome: 'APPROVED' | 'SKIPPED';
  reason?: string;
}

export type BorrowPayload = {
  requestId: number;
  requesterId: number;
  requesterName?: string;
  actorName?: string;
  detailId?: number;
  assetId?: number;
  assetCode?: string;
  assetModelName?: string;
  expectedReturnDate?: string;
  rejectionReason?: string | null;
  returnCondition?: string | null;
  items?: Array<{
    detailId: number;
    assetId?: number;
    assetCode?: string;
    assetModelName?: string;
    expectedReturnDate?: string;
  }>;
  approvalItems?: BorrowApprovalItemSnapshot[];
  notificationSuppressed?: boolean;
  bulkAction?: boolean;
  deepLinkContext?: DeepLinkContext;
};

export type IssuePayload = {
  issueId: number;
  reporterId: number;
  reporterName?: string;
  actorName?: string;
  assetId?: number;
  assetCode?: string;
  assetModelName?: string;
  issueDescription?: string | null;
  issueStatus?: string | null;
  issueResult?: string | null;
  issueNote?: string | null;
  deepLinkContext?: DeepLinkContext;
};

export interface DomainEventPayloadMap {
  'borrow_request.created': BorrowPayload;
  'borrow_request.approval_summary': BorrowPayload;
  'borrow_request_detail.approved': BorrowPayload;
  'borrow_request_detail.rejected': BorrowPayload;
  'borrow_history.handed_over': BorrowPayload;
  'borrow_history.returned': BorrowPayload;
  'borrow_history.returned_damaged': BorrowPayload;
  'asset_issue.reported': IssuePayload;
  'asset_issue.created_from_damaged_return': IssuePayload;
  'asset_issue.confirmed': IssuePayload;
  'asset_issue.rejected': IssuePayload;
  'asset_issue.repair_started': IssuePayload;
  'asset_issue.repair_completed': IssuePayload;
  'asset_issue.repair_failed': IssuePayload;
}
export interface AggregateTypeMap {
  'borrow_request.created': 'BORROW_REQUEST';
  'borrow_request.approval_summary': 'BORROW_REQUEST';
  'borrow_request_detail.approved': 'BORROW_REQUEST_DETAIL';
  'borrow_request_detail.rejected': 'BORROW_REQUEST_DETAIL';
  'borrow_history.handed_over': 'BORROW_HISTORY';
  'borrow_history.returned': 'BORROW_HISTORY';
  'borrow_history.returned_damaged': 'BORROW_HISTORY';
  'asset_issue.reported': 'ASSET_ISSUE';
  'asset_issue.created_from_damaged_return': 'ASSET_ISSUE';
  'asset_issue.confirmed': 'ASSET_ISSUE';
  'asset_issue.rejected': 'ASSET_ISSUE';
  'asset_issue.repair_started': 'ASSET_ISSUE';
  'asset_issue.repair_completed': 'ASSET_ISSUE';
  'asset_issue.repair_failed': 'ASSET_ISSUE';
}
export type DomainEvent<T extends DomainEventType = DomainEventType> =
  T extends DomainEventType
    ? {
        eventId: string;
        eventType: T;
        eventVersion: 1;
        aggregateType: AggregateTypeMap[T];
        aggregateId: number;
        actorUserId: number | null;
        correlationId: string | null;
        occurredAt: string;
        payload: DomainEventPayloadMap[T];
      }
    : never;
export type NewDomainEvent<T extends DomainEventType> = Omit<
  DomainEvent<T>,
  'eventId' | 'eventVersion' | 'occurredAt' | 'correlationId'
> & { correlationId?: string | null };

const id = z.number().int().positive();
const optionalText = z.string().max(5000).nullable().optional();
const deepLinkContext = z
  .object({
    entityType: z.enum(['BORROW_REQUEST', 'ASSET_ISSUE']),
    entityId: id,
  })
  .strict();
const common = {
  eventId: z.string().uuid(),
  eventVersion: z.literal(1),
  aggregateId: id,
  actorUserId: id.nullable(),
  correlationId: z.string().max(64).nullable(),
  occurredAt: z.string().datetime(),
};
const borrowItemSnapshot = z
  .object({
    detailId: id,
    assetId: id.optional(),
    assetCode: z.string().max(100).optional(),
    assetModelName: z.string().max(100).optional(),
    expectedReturnDate: z.string().max(50).optional(),
  })
  .strict();
const approvalItemSnapshot = z
  .object({
    detailId: id,
    assetId: id.optional(),
    assetCode: z.string().max(100).optional(),
    assetModelName: z.string().max(100).optional(),
    expectedReturnDate: z.string().max(50).optional(),
    outcome: z.enum(['APPROVED', 'SKIPPED']),
    reason: z.string().max(100).optional(),
  })
  .strict();
const borrowPayload = z
  .object({
    requestId: id,
    requesterId: id,
    requesterName: z.string().max(100).optional(),
    actorName: z.string().max(100).optional(),
    detailId: id.optional(),
    assetId: id.optional(),
    assetCode: z.string().max(100).optional(),
    assetModelName: z.string().max(100).optional(),
    expectedReturnDate: z.string().max(50).optional(),
    rejectionReason: optionalText,
    returnCondition: optionalText,
    items: z.array(borrowItemSnapshot).max(500).optional(),
    approvalItems: z.array(approvalItemSnapshot).max(500).optional(),
    notificationSuppressed: z.boolean().optional(),
    bulkAction: z.boolean().optional(),
    deepLinkContext: deepLinkContext.optional(),
  })
  .strict();
const issuePayload = z
  .object({
    issueId: id,
    reporterId: id,
    reporterName: z.string().max(100).optional(),
    actorName: z.string().max(100).optional(),
    assetId: id.optional(),
    assetCode: z.string().max(100).optional(),
    assetModelName: z.string().max(100).optional(),
    issueDescription: optionalText,
    issueStatus: optionalText,
    issueResult: optionalText,
    issueNote: optionalText,
    deepLinkContext: deepLinkContext.optional(),
  })
  .strict();
const eventSchemas = [
  z
    .object({
      ...common,
      eventType: z.literal('borrow_request.created'),
      aggregateType: z.literal('BORROW_REQUEST'),
      payload: borrowPayload,
    })
    .strict(),
  z
    .object({
      ...common,
      eventType: z.literal('borrow_request.approval_summary'),
      aggregateType: z.literal('BORROW_REQUEST'),
      payload: borrowPayload,
    })
    .strict(),
  ...(
    [
      'borrow_request_detail.approved',
      'borrow_request_detail.rejected',
    ] as const
  ).map((eventType) =>
    z
      .object({
        ...common,
        eventType: z.literal(eventType),
        aggregateType: z.literal('BORROW_REQUEST_DETAIL'),
        payload: borrowPayload,
      })
      .strict(),
  ),
  ...(
    [
      'borrow_history.handed_over',
      'borrow_history.returned',
      'borrow_history.returned_damaged',
    ] as const
  ).map((eventType) =>
    z
      .object({
        ...common,
        eventType: z.literal(eventType),
        aggregateType: z.literal('BORROW_HISTORY'),
        payload: borrowPayload,
      })
      .strict(),
  ),
  ...(
    [
      'asset_issue.reported',
      'asset_issue.created_from_damaged_return',
      'asset_issue.confirmed',
      'asset_issue.rejected',
      'asset_issue.repair_started',
      'asset_issue.repair_completed',
      'asset_issue.repair_failed',
    ] as const
  ).map((eventType) =>
    z
      .object({
        ...common,
        eventType: z.literal(eventType),
        aggregateType: z.literal('ASSET_ISSUE'),
        payload: issuePayload,
      })
      .strict(),
  ),
] as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]];
const domainEventSchema = z.discriminatedUnion(
  'eventType',
  eventSchemas as any,
);

export class PermanentDomainEventError extends Error {
  readonly permanent = true;
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PermanentDomainEventError';
  }
}
export interface PersistedOutboxEvent {
  event_id: string;
  event_type: string;
  event_version: number;
  aggregate_type: string;
  aggregate_id: number;
  actor_user_id: number | null;
  correlation_id: string | null;
  occurred_at: Date;
  payload: unknown;
}
export function parseOutboxDomainEvent(row: PersistedOutboxEvent): DomainEvent {
  const result = domainEventSchema.safeParse({
    eventId: row.event_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    actorUserId: row.actor_user_id,
    correlationId: row.correlation_id,
    occurredAt: row.occurred_at.toISOString(),
    payload: row.payload,
  });
  if (!result.success)
    throw new PermanentDomainEventError('UNSUPPORTED_DOMAIN_EVENT', {
      cause: result.error,
    });
  return result.data as DomainEvent;
}
export type OutboxTransaction = Pick<Prisma.TransactionClient, 'outbox_events'>;
export class DomainEventWriter {
  append<T extends DomainEventType>(
    input: NewDomainEvent<T>,
    tx: OutboxTransaction,
  ): Promise<unknown> {
    const occurredAt = new Date();
    const event = parseOutboxDomainEvent({
      event_id: randomUUID(),
      event_type: input.eventType,
      event_version: 1,
      aggregate_type: input.aggregateType,
      aggregate_id: input.aggregateId,
      actor_user_id: input.actorUserId,
      correlation_id: input.correlationId ?? null,
      occurred_at: occurredAt,
      payload: input.payload,
    });
    return tx.outbox_events.create({
      data: {
        event_id: event.eventId,
        event_type: event.eventType,
        event_version: 1,
        aggregate_type: event.aggregateType,
        aggregate_id: event.aggregateId,
        actor_user_id: event.actorUserId,
        correlation_id: event.correlationId,
        occurred_at: occurredAt,
        payload: event.payload as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

export interface NotificationIntent {
  recipient:
    | { kind: 'DIRECT_USER'; userId: number }
    | {
        kind: 'ANY_PERMISSION';
        permissionCodes: readonly string[];
        excludedUserIds: readonly number[];
      };
  channels: readonly ['IN_APP', 'EMAIL'];
  templateVersion: 1;
  templateParams: Record<string, string | number | null>;
  notificationType: string;
  relatedEntityType: 'BORROW_REQUEST' | 'ASSET_ISSUE';
  relatedEntityId: number;
}
export interface DomainEventObserver {
  readonly subscribedEventTypes: readonly DomainEventType[];
  onEvent(event: DomainEvent): Promise<readonly NotificationIntent[]>;
}
type Definition = {
  notificationType: string;
  title: string;
  message: (e: any) => string;
  recipient: (e: any) => NotificationIntent['recipient'];
  entity: 'BORROW_REQUEST' | 'ASSET_ISSUE';
};
export const NOTIFICATION_DEFINITIONS: Record<DomainEventType, Definition> = {
  'borrow_request.created': {
    notificationType: 'BORROW_REQUEST_CREATED',
    title: 'New borrow request',
    message: (e) => `Borrow request #${e.payload.requestId} requires review.`,
    recipient: (e) => ({
      kind: 'ANY_PERMISSION',
      permissionCodes: ['borrow_request.view_all', 'borrow_request.approve'],
      excludedUserIds: [e.payload.requesterId],
    }),
    entity: 'BORROW_REQUEST',
  },
  'borrow_request.approval_summary': {
    notificationType: 'BORROW_APPROVAL_SUMMARY',
    title: 'Borrow request approval summary',
    message: (e) =>
      'Approval results for borrow request #' + e.payload.requestId + ' are ready.',
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.requesterId }),
    entity: 'BORROW_REQUEST',
  },
  'borrow_request_detail.approved': {
    notificationType: 'BORROW_DETAIL_APPROVED',
    title: 'Borrow request item approved',
    message: (e) =>
      `An item in borrow request #${e.payload.requestId} was approved.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.requesterId }),
    entity: 'BORROW_REQUEST',
  },
  'borrow_request_detail.rejected': {
    notificationType: 'BORROW_DETAIL_REJECTED',
    title: 'Borrow request item rejected',
    message: (e) =>
      `An item in borrow request #${e.payload.requestId} was rejected.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.requesterId }),
    entity: 'BORROW_REQUEST',
  },
  'borrow_history.handed_over': {
    notificationType: 'ASSET_HANDED_OVER',
    title: 'Asset handover confirmed',
    message: (e) =>
      `Asset handover for borrow request #${e.payload.requestId} was confirmed.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.requesterId }),
    entity: 'BORROW_REQUEST',
  },
  'borrow_history.returned': {
    notificationType: 'ASSET_RETURNED',
    title: 'Asset return confirmed',
    message: (e) =>
      `An asset return for borrow request #${e.payload.requestId} was confirmed.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.requesterId }),
    entity: 'BORROW_REQUEST',
  },
  'borrow_history.returned_damaged': {
    notificationType: 'ASSET_RETURNED_DAMAGED',
    title: 'Damaged asset return confirmed',
    message: (e) =>
      `A damaged asset return for borrow request #${e.payload.requestId} was confirmed.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.requesterId }),
    entity: 'BORROW_REQUEST',
  },
  'asset_issue.reported': {
    notificationType: 'ASSET_ISSUE_REPORTED',
    title: 'New asset issue reported',
    message: (e) => `Asset issue #${e.payload.issueId} requires review.`,
    recipient: (e) => ({
      kind: 'ANY_PERMISSION',
      permissionCodes: ['asset_issue.view', 'asset_issue.update'],
      excludedUserIds: [e.payload.reporterId],
    }),
    entity: 'ASSET_ISSUE',
  },
  'asset_issue.created_from_damaged_return': {
    notificationType: 'ASSET_ISSUE_CONFIRMED',
    title: 'Asset issue confirmed from damaged return',
    message: (e) =>
      `Asset issue #${e.payload.issueId} was confirmed from a damaged return.`,
    recipient: (e) => ({
      kind: 'ANY_PERMISSION',
      permissionCodes: ['asset_issue.view', 'asset_issue.update'],
      excludedUserIds: e.actorUserId ? [e.actorUserId] : [],
    }),
    entity: 'ASSET_ISSUE',
  },
  'asset_issue.confirmed': {
    notificationType: 'ASSET_ISSUE_CONFIRMED',
    title: 'Asset issue confirmed',
    message: (e) => `Asset issue confirmed for issue #${e.payload.issueId}.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.reporterId }),
    entity: 'ASSET_ISSUE',
  },
  'asset_issue.rejected': {
    notificationType: 'ASSET_ISSUE_REJECTED',
    title: 'Asset issue rejected',
    message: (e) => `Asset issue rejected for issue #${e.payload.issueId}.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.reporterId }),
    entity: 'ASSET_ISSUE',
  },
  'asset_issue.repair_started': {
    notificationType: 'ASSET_REPAIR_STARTED',
    title: 'Asset repair started',
    message: (e) => `Asset repair started for issue #${e.payload.issueId}.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.reporterId }),
    entity: 'ASSET_ISSUE',
  },
  'asset_issue.repair_completed': {
    notificationType: 'ASSET_REPAIR_COMPLETED',
    title: 'Asset repair completed',
    message: (e) => `Asset repair completed for issue #${e.payload.issueId}.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.reporterId }),
    entity: 'ASSET_ISSUE',
  },
  'asset_issue.repair_failed': {
    notificationType: 'ASSET_REPAIR_FAILED',
    title: 'Asset repair failed',
    message: (e) => `Asset repair failed for issue #${e.payload.issueId}.`,
    recipient: (e) => ({ kind: 'DIRECT_USER', userId: e.payload.reporterId }),
    entity: 'ASSET_ISSUE',
  },
};
abstract class DefinitionObserver implements DomainEventObserver {
  abstract readonly subscribedEventTypes: readonly DomainEventType[];
  async onEvent(event: DomainEvent) {
    if (!this.subscribedEventTypes.includes(event.eventType)) return [];
    if (
      event.eventType === 'borrow_request_detail.approved' &&
      ((event.payload as BorrowPayload).notificationSuppressed ||
        (event.payload as BorrowPayload).bulkAction)
    ) {
      return [];
    }
    const d = NOTIFICATION_DEFINITIONS[event.eventType];
    const relatedEntityId =
      d.entity === 'BORROW_REQUEST'
        ? (event.payload as BorrowPayload).requestId
        : (event.payload as IssuePayload).issueId;
    return [
      {
        recipient: d.recipient(event),
        channels: ['IN_APP', 'EMAIL'] as const,
        templateVersion: 1 as const,
        templateParams: { title: d.title, message: d.message(event) },
        notificationType: d.notificationType,
        relatedEntityType: d.entity,
        relatedEntityId,
      },
    ];
  }
}
export class BorrowRequestNotificationObserver extends DefinitionObserver {
  readonly subscribedEventTypes = [
    'borrow_request.created',
    'borrow_request.approval_summary',
    'borrow_request_detail.approved',
    'borrow_request_detail.rejected',
  ] as const;
}
export class BorrowHistoryNotificationObserver extends DefinitionObserver {
  readonly subscribedEventTypes = [
    'borrow_history.handed_over',
    'borrow_history.returned',
    'borrow_history.returned_damaged',
  ] as const;
}
export class AssetIssueNotificationObserver extends DefinitionObserver {
  readonly subscribedEventTypes = [
    'asset_issue.reported',
    'asset_issue.created_from_damaged_return',
    'asset_issue.confirmed',
    'asset_issue.rejected',
    'asset_issue.repair_started',
    'asset_issue.repair_completed',
    'asset_issue.repair_failed',
  ] as const;
}
export class DomainEventDispatcher {
  constructor(private readonly observers: readonly DomainEventObserver[]) {}
  async publish(event: DomainEvent) {
    const matching = this.observers.filter((o) =>
      o.subscribedEventTypes.includes(event.eventType),
    );
    if (!matching.length)
      throw new PermanentDomainEventError('UNSUPPORTED_EVENT_TYPE');
    return (await Promise.all(matching.map((o) => o.onEvent(event)))).flat();
  }
}
export function createDomainEventDispatcher() {
  return new DomainEventDispatcher([
    new BorrowRequestNotificationObserver(),
    new BorrowHistoryNotificationObserver(),
    new AssetIssueNotificationObserver(),
  ]);
}
