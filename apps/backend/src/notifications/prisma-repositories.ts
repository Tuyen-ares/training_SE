import { Prisma, type PrismaClient } from '../../generated/prisma/index.js';
import type { DomainEvent } from '@/notifications/domain-event.js';
import type {
  ClaimedDelivery,
  ClaimedOutbox,
  DeliveryChannel,
  DeliveryRepository,
  MaterializedDelivery,
  OutboxRepository,
  PublishingDelivery,
  RecipientRepository,
  ResolvedRecipient,
} from '@/notifications/repositories.js';
import { deterministicSmtpMessageId } from '@/notifications/template-catalog.js';

export class PrismaRecipientRepository implements RecipientRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async findDirect(userId: number): Promise<ResolvedRecipient | null> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, is_active: true },
    });
    return user
      ? { userId: user.id, email: user.email, active: user.is_active }
      : null;
  }
  async findActiveByPermissions(
    codes: readonly string[],
    excluded: readonly number[],
  ): Promise<ResolvedRecipient[]> {
    if (!codes.length) return [];
    const users = await this.prisma.users.findMany({
      where: {
        is_active: true,
        id: { notIn: [...excluded] },
        user_roles: {
          some: {
            roles: {
              role_permissions: {
                some: { permissions: { code: { in: [...codes] } } },
              },
            },
          },
        },
      },
      select: { id: true, email: true, is_active: true },
      distinct: ['id'],
    });
    return users.map((user) => ({
      userId: user.id,
      email: user.email,
      active: user.is_active,
    }));
  }
}

export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async claimDue({
    workerId,
    limit,
    staleBefore,
  }: {
    workerId: string;
    limit: number;
    staleBefore: Date;
  }): Promise<ClaimedOutbox[]> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const ids = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM outbox_events
        WHERE (
          (status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= ${now}))
          OR (status = 'PROCESSING' AND locked_at < ${staleBefore})
        )
        ORDER BY COALESCE(next_attempt_at, created_at), id
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `);
      if (!ids.length) return [];
      const claimedIds = ids.map((row) => row.id);
      await tx.outbox_events.updateMany({
        where: { id: { in: claimedIds } },
        data: {
          status: 'PROCESSING',
          locked_at: now,
          locked_by: workerId,
          dispatch_attempt_count: { increment: 1 },
        },
      });
      const rows = await tx.outbox_events.findMany({
        where: { id: { in: claimedIds } },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      });
      return rows.map((row) => ({ ...row, locked_by: workerId }));
    });
  }
  async finalizeDispatch(
    claim: ClaimedOutbox,
    event: DomainEvent,
    deliveries: readonly MaterializedDelivery[],
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.outbox_events.findFirst({
        where: {
          id: claim.id,
          status: 'PROCESSING',
          locked_by: claim.locked_by,
        },
      });
      if (!owned) return false;
      const messageSource = deliveries[0];
      const message = messageSource
        ? await tx.notification_messages.upsert({
            where: { event_id: event.eventId },
            create: {
              event_id: event.eventId,
              event_type: event.eventType,
              template_version: messageSource.templateVersion,
              payload: messageSource.messagePayload as Prisma.InputJsonValue,
            },
            update: {},
          })
        : null;
      for (const item of deliveries)
        for (const channel of item.intent.channels) {
          const inactive = !item.recipient.active;
          await tx.notification_deliveries.upsert({
            where: {
              event_id_recipient_user_id_channel: {
                event_id: event.eventId,
                recipient_user_id: item.recipient.userId,
                channel,
              },
            },
            create: {
              event_id: event.eventId,
              message_id: message?.id ?? null,
              correlation_id_snapshot: event.correlationId,
              recipient_user_id: item.recipient.userId,
              channel,
              status: inactive ? 'SKIPPED' : 'PENDING',
              skip_reason: inactive ? 'USER_INACTIVE' : null,
              skipped_at: inactive ? new Date() : null,
              recipient_address:
                channel === 'EMAIL' ? item.recipient.email : null,
              notification_type: item.intent.notificationType,
              title_snapshot: item.title,
              text_body_snapshot: item.text,
              related_entity_type: item.intent.relatedEntityType,
              related_entity_id: item.intent.relatedEntityId,
              outbound_message_id:
                channel === 'EMAIL'
                  ? deterministicSmtpMessageId(
                      event.eventId,
                      item.recipient.userId,
                    )
                  : null,
            },
            update: {},
          });
        }
      const changed = await tx.outbox_events.updateMany({
        where: {
          id: claim.id,
          status: 'PROCESSING',
          locked_by: claim.locked_by,
        },
        data: {
          status: 'DISPATCHED',
          dispatched_at: new Date(),
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
          last_error: null,
        },
      });
      return changed.count === 1;
    });
  }
  async release(claim: ClaimedOutbox, error: string, nextAttemptAt: Date) {
    return (
      (
        await this.prisma.outbox_events.updateMany({
          where: {
            id: claim.id,
            status: 'PROCESSING',
            locked_by: claim.locked_by,
          },
          data: {
            status: 'PENDING',
            next_attempt_at: nextAttemptAt,
            locked_at: null,
            locked_by: null,
            last_error: error,
          },
        })
      ).count === 1
    );
  }
  async fail(claim: ClaimedOutbox, error: string) {
    return (
      (
        await this.prisma.outbox_events.updateMany({
          where: {
            id: claim.id,
            status: 'PROCESSING',
            locked_by: claim.locked_by,
          },
          data: {
            status: 'FAILED',
            next_attempt_at: null,
            locked_at: null,
            locked_by: null,
            last_error: error,
          },
        })
      ).count === 1
    );
  }
  async cleanup(before: Date, limit: number) {
    const rows = await this.prisma.outbox_events.findMany({
      where: {
        status: { in: ['DISPATCHED', 'FAILED'] },
        updated_at: { lt: before },
      },
      select: { id: true },
      take: limit,
    });
    if (!rows.length) return 0;
    return (
      await this.prisma.outbox_events.deleteMany({
        where: { id: { in: rows.map((row) => row.id) } },
      })
    ).count;
  }
}

function mapDelivery(row: any, leaseOwner: string): ClaimedDelivery {
  return {
    id: row.id,
    eventId: row.event_id,
    correlationIdSnapshot: row.correlation_id_snapshot,
    recipientUserId: row.recipient_user_id,
    channel: row.channel,
    recipientAddress: row.recipient_address,
    notificationId: row.notification_id,
    messageId: row.message_id,
    eventType: row.notification_messages?.event_type ?? null,
    templateVersion: row.notification_messages?.template_version ?? null,
    messagePayload: row.notification_messages?.payload ?? null,
    notificationType: row.notification_type,
    title: row.title_snapshot,
    text: row.text_body_snapshot,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    outboundMessageId: row.outbound_message_id,
    attemptCount: row.attempt_count,
    leaseOwner,
  };
}
export class PrismaDeliveryRepository implements DeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async claimDue({
    workerId,
    channel,
    limit,
    staleBefore,
  }: {
    workerId: string;
    channel: DeliveryChannel;
    limit: number;
    staleBefore: Date;
  }) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const ids = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM notification_deliveries
        WHERE channel = ${channel}
          AND (
            (status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= ${now}))
            OR (status = 'PUBLISHING' AND next_attempt_at <= ${now})
            OR (status = 'PROCESSING' AND locked_at < ${staleBefore})
          )
        ORDER BY COALESCE(next_attempt_at, created_at), id
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `);
      if (!ids.length) return [];
      const claimedIds = ids.map((row) => row.id);
      await tx.notification_deliveries.updateMany({
        where: { id: { in: claimedIds } },
        data: {
          status: 'PROCESSING',
          locked_at: now,
          locked_by: workerId,
          attempt_count: { increment: 1 },
        },
      });
      const rows = await tx.notification_deliveries.findMany({
        where: { id: { in: claimedIds } },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        include: { notification_messages: true },
      });
      return rows.map((row) => mapDelivery(row, workerId));
    });
  }
  async claimForPublishing({ workerId, channel, limit, leaseTimeoutMs }: { workerId: string; channel: DeliveryChannel; limit: number; leaseTimeoutMs: number }) {
    const now = new Date();
    const deadline = new Date(now.getTime() + leaseTimeoutMs);
    return this.prisma.$transaction(async (tx) => {
      const ids = await tx.$queryRawUnsafe<Array<{ id: bigint }>>(
        "SELECT id FROM notification_deliveries WHERE channel = ? AND ((status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)) OR (status = 'PUBLISHING' AND next_attempt_at <= ?)) ORDER BY COALESCE(next_attempt_at, created_at), id LIMIT ? FOR UPDATE SKIP LOCKED",
        channel, now, now, limit,
      );
      if (!ids.length) return [];
      const claimedIds = ids.map((row) => row.id);
      await tx.notification_deliveries.updateMany({
        where: { id: { in: claimedIds } },
        data: { status: 'PUBLISHING', locked_at: now, locked_by: workerId, next_attempt_at: deadline },
      });
      const rows = await tx.notification_deliveries.findMany({ where: { id: { in: claimedIds } }, orderBy: [{ created_at: 'asc' }, { id: 'asc' }], include: { notification_messages: true } });
      return rows.map((row) => ({ ...mapDelivery(row, workerId), publishLease: workerId }));
    });
  }

  async reclaimStaleProcessing(channel: DeliveryChannel, staleBefore: Date, limit: number) {
    const rows = await this.prisma.notification_deliveries.findMany({ where: { channel, status: 'PROCESSING', locked_at: { lt: staleBefore } }, select: { id: true }, take: limit });
    if (!rows.length) return 0;
    return (await this.prisma.notification_deliveries.updateMany({
      where: { id: { in: rows.map((row) => row.id) }, channel, status: 'PROCESSING', locked_at: { lt: staleBefore } },
      data: { status: 'PENDING', next_attempt_at: new Date(), locked_at: null, locked_by: null, last_error: 'CONSUMER_LEASE_EXPIRED' },
    })).count;
  }

  async heartbeatPublishing({ deliveryId, publishLease, now, leaseDeadline }: { deliveryId: bigint; publishLease: string; now: Date; leaseDeadline: Date }) {
    return (await this.prisma.notification_deliveries.updateMany({
      where: { id: deliveryId, status: 'PUBLISHING', locked_by: publishLease },
      data: { locked_at: now, next_attempt_at: leaseDeadline },
    })).count === 1;
  }

  async releasePublishing(claim: PublishingDelivery, error: string, nextAttemptAt: Date) {
    return (await this.prisma.notification_deliveries.updateMany({
      where: { id: claim.id, status: 'PUBLISHING', locked_by: claim.publishLease },
      data: { status: 'PENDING', next_attempt_at: nextAttemptAt, locked_at: null, locked_by: null, last_error: error },
    })).count === 1;
  }

  async readDeliveryState(id: bigint) {
    const row = await this.prisma.notification_deliveries.findUnique({ where: { id }, select: { id: true, status: true, locked_by: true } });
    return row ? { id: row.id, status: row.status, lockedBy: row.locked_by } : null;
  }

  async claimPublished({ deliveryId, eventId, channel, publishLease, consumerLease }: { deliveryId: bigint; eventId: string; channel: DeliveryChannel; publishLease: string; consumerLease: string }) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.notification_deliveries.updateMany({
        where: { id: deliveryId, event_id: eventId, channel, status: 'PUBLISHING', locked_by: publishLease },
        data: { status: 'PROCESSING', locked_by: consumerLease, locked_at: now, attempt_count: { increment: 1 } },
      });
      if (changed.count !== 1) return null;
      const row = await tx.notification_deliveries.findUnique({ where: { id: deliveryId }, include: { notification_messages: true } });
      return row ? mapDelivery(row, consumerLease) : null;
    });
  }

  async heartbeatProcessing({ deliveryId, consumerLease, now }: { deliveryId: bigint; consumerLease: string; now: Date }) {
    return (await this.prisma.notification_deliveries.updateMany({
      where: { id: deliveryId, status: 'PROCESSING', locked_by: consumerLease },
      data: { locked_at: now },
    })).count === 1;
  }
  async isRecipientActive(userId: number) {
    return Boolean(
      await this.prisma.users.findFirst({
        where: { id: userId, is_active: true },
        select: { id: true },
      }),
    );
  }
  async completeInApp(claim: ClaimedDelivery) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.notification_deliveries.findFirst({
        where: {
          id: claim.id,
          status: 'PROCESSING',
          locked_by: claim.leaseOwner,
        },
      });
      if (!current) return false;
      let notificationId = current.notification_id;
      if (!notificationId) {
        const notification = await tx.notifications.create({
          data: {
            recipient_user_id: current.recipient_user_id,
            notification_type: current.notification_type,
            title: current.title_snapshot,
            message: current.text_body_snapshot,
            related_entity_type: current.related_entity_type,
            related_entity_id: current.related_entity_id,
          },
        });
        notificationId = notification.id;
      }
      const changed = await tx.notification_deliveries.updateMany({
        where: {
          id: claim.id,
          status: 'PROCESSING',
          locked_by: claim.leaseOwner,
        },
        data: {
          notification_id: notificationId,
          status: 'SENT',
          sent_at: new Date(),
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
          last_error: null,
        },
      });
      if (changed.count !== 1) throw new Error('DELIVERY_LEASE_LOST');
      return true;
    });
  }
  async markSent(claim: ClaimedDelivery, providerMessageId?: string) {
    return (
      (
        await this.prisma.notification_deliveries.updateMany({
          where: {
            id: claim.id,
            status: 'PROCESSING',
            locked_by: claim.leaseOwner,
          },
          data: {
            status: 'SENT',
            sent_at: new Date(),
            provider_message_id: providerMessageId,
            locked_at: null,
            locked_by: null,
            next_attempt_at: null,
            last_error: null,
          },
        })
      ).count === 1
    );
  }
  async retry(claim: ClaimedDelivery, error: string, nextAttemptAt: Date) {
    return (
      (
        await this.prisma.notification_deliveries.updateMany({
          where: {
            id: claim.id,
            status: 'PROCESSING',
            locked_by: claim.leaseOwner,
          },
          data: {
            status: 'PENDING',
            next_attempt_at: nextAttemptAt,
            locked_at: null,
            locked_by: null,
            last_error: error,
          },
        })
      ).count === 1
    );
  }
  async fail(claim: ClaimedDelivery, error: string) {
    return (
      (
        await this.prisma.notification_deliveries.updateMany({
          where: {
            id: claim.id,
            status: 'PROCESSING',
            locked_by: claim.leaseOwner,
          },
          data: {
            status: 'FAILED',
            next_attempt_at: null,
            locked_at: null,
            locked_by: null,
            last_error: error,
          },
        })
      ).count === 1
    );
  }
  async skip(claim: ClaimedDelivery, reason: string) {
    return (
      (
        await this.prisma.notification_deliveries.updateMany({
          where: {
            id: claim.id,
            status: 'PROCESSING',
            locked_by: claim.leaseOwner,
          },
          data: {
            status: 'SKIPPED',
            skip_reason: reason,
            skipped_at: new Date(),
            locked_at: null,
            locked_by: null,
            next_attempt_at: null,
          },
        })
      ).count === 1
    );
  }
  async releasePending(claim: ClaimedDelivery, error: string) {
    return (
      (
        await this.prisma.notification_deliveries.updateMany({
          where: {
            id: claim.id,
            status: 'PROCESSING',
            locked_by: claim.leaseOwner,
          },
          data: {
            status: 'PENDING',
            next_attempt_at: null,
            locked_at: null,
            locked_by: null,
            last_error: error,
            attempt_count: { decrement: 1 },
          },
        })
      ).count === 1
    );
  }
  async cleanup(before: Date, limit: number) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.notification_deliveries.findMany({
        where: {
          status: { in: ['SENT', 'SKIPPED', 'FAILED'] },
          updated_at: { lt: before },
        },
        select: { id: true, message_id: true },
        take: limit,
      });
      if (!rows.length) return 0;
      const deleted = await tx.notification_deliveries.deleteMany({
        where: { id: { in: rows.map((row) => row.id) } },
      });
      const messageIds = [
        ...new Set(
          rows
            .map((row) => row.message_id)
            .filter((id): id is bigint => id !== null),
        ),
      ];
      if (messageIds.length) {
        await tx.notification_messages.deleteMany({
          where: {
            id: { in: messageIds },
            notification_deliveries: { none: {} },
          },
        });
      }
      return deleted.count;
    });
  }}
