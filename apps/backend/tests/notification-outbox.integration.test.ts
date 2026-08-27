import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prisma from '@/prisma.js';
import {
  createDomainEventDispatcher,
  parseOutboxDomainEvent,
} from '@/notifications/domain-event.js';
import { NotificationMaterializer } from '@/notifications/materializer.js';
import {
  PrismaDeliveryRepository,
  PrismaOutboxRepository,
  PrismaRecipientRepository,
} from '@/notifications/prisma-repositories.js';
import { RecipientResolver } from '@/notifications/recipient-resolver.js';
import { NotificationTemplateCatalog } from '@/notifications/template-catalog.js';

test('outbox and delivery claims enforce lease ownership and atomic materialization', async (context) => {
  const department = await prisma.departments.findFirst({
    select: { id: true },
  });
  assert.ok(department);
  const suffix = Date.now().toString().slice(-8);
  const users = await Promise.all(
    [true, false].map((active, index) =>
      prisma.users.create({
        data: {
          user_code: `NO${suffix}${index}`,
          department_id: department.id,
          name: `Outbox ${index}`,
          email: `outbox.${suffix}.${index}@test.local`,
          phone: `7${suffix}${index}`.slice(0, 10),
          password: 'unused',
          is_active: active,
        },
      }),
    ),
  );
  const eventIds: string[] = [];
  context.after(async () => {
    await prisma.notification_deliveries.deleteMany({
      where: { event_id: { in: eventIds } },
    });
    await prisma.notification_messages.deleteMany({
      where: { event_id: { in: eventIds } },
    });
    await prisma.notifications.deleteMany({
      where: { recipient_user_id: { in: users.map((user) => user.id) } },
    });
    await prisma.outbox_events.deleteMany({
      where: { event_id: { in: eventIds } },
    });
    await prisma.users.deleteMany({
      where: { id: { in: users.map((user) => user.id) } },
    });
    await prisma.$disconnect();
  });
  const createEvent = async (recipientId: number, rich = false) => {
    const eventId = randomUUID();
    eventIds.push(eventId);
    return prisma.outbox_events.create({
      data: {
        event_id: eventId,
        event_type: 'borrow_request_detail.approved',
        event_version: 1,
        aggregate_type: 'BORROW_REQUEST_DETAIL',
        aggregate_id: recipientId,
        actor_user_id: null,
        occurred_at: new Date(),
        payload: rich
          ? {
              requestId: recipientId,
              requesterId: recipientId,
              requesterName: users[0].name,
              actorName: 'Outbox reviewer',
              detailId: 501,
              assetId: 601,
              assetCode: 'LAP-001',
              assetModelName: 'Dell Latitude 5440',
              expectedReturnDate: '2026-08-30',
              deepLinkContext: { entityType: 'BORROW_REQUEST', entityId: recipientId },
            }
          : { requestId: recipientId, requesterId: recipientId },
      },
    });
  };
  const createSummaryEvent = async (recipientId: number) => {
    const eventId = randomUUID();
    eventIds.push(eventId);
    return prisma.outbox_events.create({
      data: {
        event_id: eventId,
        event_type: 'borrow_request.approval_summary',
        event_version: 1,
        aggregate_type: 'BORROW_REQUEST',
        aggregate_id: recipientId,
        actor_user_id: users[0].id,
        occurred_at: new Date(),
        payload: {
          requestId: recipientId,
          requesterId: recipientId,
          requesterName: users[0].name,
          actorName: 'Outbox reviewer',
          approvalItems: [
            {
              detailId: 501,
              assetCode: 'LAP-001',
              assetModelName: 'Dell Latitude 5440',
              expectedReturnDate: '2026-08-30',
              outcome: 'APPROVED',
            },
          ],
        },
      },
    });
  };

  const outboxA = new PrismaOutboxRepository(prisma),
    outboxB = new PrismaOutboxRepository(prisma);
  const target = await createEvent(users[0].id, true);
  const [a, b] = await Promise.all([
    outboxA.claimDue({ workerId: 'A', limit: 100, staleBefore: new Date(0) }),
    outboxB.claimDue({ workerId: 'B', limit: 100, staleBefore: new Date(0) }),
  ]);
  const targetClaims = [...a, ...b].filter((item) => item.id === target.id);
  assert.equal(targetClaims.length, 1, 'two claimants must have one winner');
  for (const unrelated of [...a, ...b].filter((item) => item.id !== target.id))
    await outboxA.release(unrelated, 'TEST_RELEASE', new Date());
  const winner = targetClaims[0];
  const loserOwner = winner.locked_by === 'A' ? 'B' : 'A';
  assert.equal(
    await outboxA.release(
      { ...winner, locked_by: loserOwner },
      'stale',
      new Date(),
    ),
    false,
    'non-owner cannot release',
  );
  const event = parseOutboxDomainEvent(winner),
    intents = await createDomainEventDispatcher().publish(event);
  const materializer = new NotificationMaterializer(
    new RecipientResolver(new PrismaRecipientRepository(prisma)),
    new NotificationTemplateCatalog(),
    winner.locked_by === 'A' ? outboxA : outboxB,
    'https://bigin.test',
  );
  assert.equal(await materializer.materialize(winner, event, intents), true);
  const dispatched = await prisma.outbox_events.findUniqueOrThrow({
    where: { event_id: event.eventId },
  });
  assert.equal(dispatched.status, 'DISPATCHED');
  assert.equal(dispatched.dispatch_attempt_count, 1);
  assert.equal(
    await prisma.notification_deliveries.count({
      where: { event_id: event.eventId },
    }),
    2,
  );
  const message = await prisma.notification_messages.findUniqueOrThrow({
    where: { event_id: event.eventId },
  });
  assert.equal(message.event_type, event.eventType);
  assert.equal(message.template_version, 1);
  assert.deepEqual(message.payload, {
    requestId: event.payload.requestId,
    requesterId: event.payload.requesterId,
    requesterName: users[0].name,
    actorName: 'Outbox reviewer',
    detailId: 501,
    assetId: 601,
    assetCode: 'LAP-001',
    assetModelName: 'Dell Latitude 5440',
    expectedReturnDate: '2026-08-30',
    deepLinkContext: { entityType: 'BORROW_REQUEST', entityId: event.payload.requestId },
    title: 'Borrow request item approved',
    message: 'An item in borrow request #' + event.payload.requestId + ' was approved.',
    actorUserId: event.actorUserId,
    occurredAt: event.occurredAt,
    deepLink: 'https://bigin.test/borrow-requests/'+event.payload.requestId,
  });
  const createdDeliveries = await prisma.notification_deliveries.findMany({
    where: { event_id: event.eventId },
  });
  assert.ok(createdDeliveries.every((row) => row.message_id === message.id));
  assert.ok(createdDeliveries.every((row) => row.status === 'PENDING'));

  const summaryRow = await createSummaryEvent(users[0].id);
  const summaryClaims = await outboxA.claimDue({
    workerId: 'summary',
    limit: 1000,
    staleBefore: new Date(0),
  });
  const summaryClaim = summaryClaims.find((item) => item.id === summaryRow.id)!;
  for (const unrelated of summaryClaims.filter((item) => item.id !== summaryRow.id))
    await outboxA.release(unrelated, 'TEST_RELEASE', new Date());
  const summaryEvent = parseOutboxDomainEvent(summaryClaim);
  await new NotificationMaterializer(
    new RecipientResolver(new PrismaRecipientRepository(prisma)),
    new NotificationTemplateCatalog(),
    outboxA,
    'https://bigin.test',
  ).materialize(
    summaryClaim,
    summaryEvent,
    await createDomainEventDispatcher().publish(summaryEvent),
  );
  const summaryDeliveries = await prisma.notification_deliveries.findMany({
    where: { event_id: summaryEvent.eventId },
  });
  assert.equal(summaryDeliveries.length, 2);
  assert.equal(summaryDeliveries.filter((row) => row.channel === 'EMAIL').length, 1);
  assert.equal(summaryDeliveries.filter((row) => row.channel === 'IN_APP').length, 1);

  const inactiveRow = await createEvent(users[1].id);
  const inactiveClaims = await outboxA.claimDue({
    workerId: 'inactive',
    limit: 1000,
    staleBefore: new Date(0),
  });
  const inactiveClaim = inactiveClaims.find(
    (item) => item.id === inactiveRow.id,
  )!;
  for (const unrelated of inactiveClaims.filter(
    (item) => item.id !== inactiveRow.id,
  ))
    await outboxA.release(unrelated, 'TEST_RELEASE', new Date());
  const inactiveEvent = parseOutboxDomainEvent(inactiveClaim);
  await new NotificationMaterializer(
    new RecipientResolver(new PrismaRecipientRepository(prisma)),
    new NotificationTemplateCatalog(),
    outboxA,
    '',
  ).materialize(
    inactiveClaim,
    inactiveEvent,
    await createDomainEventDispatcher().publish(inactiveEvent),
  );
  const skipped = await prisma.notification_deliveries.findMany({
    where: { event_id: inactiveEvent.eventId },
  });
  assert.equal(skipped.length, 2);
  assert.ok(
    skipped.every(
      (row) => row.status === 'SKIPPED' && row.skip_reason === 'USER_INACTIVE',
    ),
  );

  const deliveryRepository = new PrismaDeliveryRepository(prisma);
  const protectedUntil = new Date(Date.now() + 60_000);
  await prisma.notification_deliveries.updateMany({
    where: { event_id: event.eventId, channel: 'IN_APP' },
    data: { next_attempt_at: protectedUntil },
  });
  await prisma.notification_deliveries.updateMany({
    where: { event_id: event.eventId, channel: 'IN_APP' },
    data: { next_attempt_at: new Date() },
  });
  const allDeliveryClaims = await deliveryRepository.claimDue({
    workerId: 'old',
    channel: 'IN_APP',
    limit: 100_000,
    staleBefore: new Date(0),
  });
  const oldClaim = allDeliveryClaims.find(
    (item) => item.eventId === event.eventId,
  )!;
  assert.ok(oldClaim, 'target in-app delivery must be claimed');
  assert.equal(oldClaim.attemptCount, 1);
  for (const unrelated of allDeliveryClaims.filter(
    (item) => item.id !== oldClaim.id,
  ))
    await deliveryRepository.releasePending(unrelated, 'TEST_RELEASE');
  await prisma.notification_deliveries.update({
    where: { id: oldClaim.id },
    data: { locked_at: new Date(Date.now() - 600_000) },
  });
  const newClaim = (
    await deliveryRepository.claimDue({
      workerId: 'new',
      channel: 'IN_APP',
      limit: 1000,
      staleBefore: new Date(Date.now() - 300_000),
    })
  ).find((item) => item.id === oldClaim.id)!;
  assert.ok(newClaim, 'stale lease must be reclaimed');
  assert.equal(newClaim.attemptCount, 2);
  assert.equal(await deliveryRepository.completeInApp(oldClaim), false);
  assert.equal(
    await prisma.notifications.count({
      where: { recipient_user_id: users[0].id },
    }),
    0,
    'stale owner must not create an orphan',
  );
  assert.equal(await deliveryRepository.completeInApp(newClaim), true);
  assert.equal(
    await prisma.notifications.count({
      where: { recipient_user_id: users[0].id },
    }),
    1,
  );
  assert.equal(await deliveryRepository.completeInApp(newClaim), false);
  assert.equal(
    await prisma.notifications.count({
      where: { recipient_user_id: users[0].id },
    }),
    1,
  );
});
