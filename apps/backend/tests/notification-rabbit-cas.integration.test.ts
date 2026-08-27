import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import prisma from '@/prisma.js';
import { PrismaDeliveryRepository } from '@/notifications/prisma-repositories.js';

test('MariaDB delivery leases use CAS for publishing and consumer transitions', async (context) => {
  const department = await prisma.departments.findFirst({
    select: { id: true },
  });
  assert.ok(department);

  const suffix = Date.now().toString().slice(-8);
  const user = await prisma.users.create({
    data: {
      user_code: `CAS${suffix}`,
      department_id: department.id,
      name: 'Rabbit CAS',
      email: `rabbit.cas.${suffix}@test.local`,
      phone: `8${suffix}`.slice(0, 10),
      password: 'unused',
      is_active: true,
    },
  });
  const pendingEventId = randomUUID();
  const staleEventId = randomUUID();
  const staleAt = new Date(Date.now() - 60_000);
  const [pending, stalePublishing] = await Promise.all([
    prisma.notification_deliveries.create({
      data: {
        event_id: pendingEventId,
        correlation_id_snapshot: 'cas-correlation',
        recipient_user_id: user.id,
        channel: 'EMAIL',
        status: 'PENDING',
        recipient_address: user.email,
        notification_type: 'CAS_TEST',
        title_snapshot: 'CAS test',
        text_body_snapshot: 'CAS test',
        attempt_count: 0,
      },
    }),
    prisma.notification_deliveries.create({
      data: {
        event_id: staleEventId,
        recipient_user_id: user.id,
        channel: 'EMAIL',
        status: 'PUBLISHING',
        recipient_address: user.email,
        notification_type: 'CAS_TEST',
        title_snapshot: 'CAS stale test',
        text_body_snapshot: 'CAS stale test',
        attempt_count: 0,
        locked_at: staleAt,
        locked_by: 'pub:stale-owner',
        next_attempt_at: staleAt,
      },
    }),
  ]);

  context.after(async () => {
    await prisma.notification_deliveries.deleteMany({
      where: { event_id: { in: [pendingEventId, staleEventId] } },
    });
    await prisma.users.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  const repository = new PrismaDeliveryRepository(prisma);
  const publishLease = `pub:test:${randomUUID()}`;
  const consumerLease = `con:test:${randomUUID()}`;
  const claims = await repository.claimForPublishing({
    workerId: publishLease,
    channel: 'EMAIL',
    limit: 1000,
    leaseTimeoutMs: 60_000,
  });
  const pendingClaim = claims.find((claim) => claim.id === pending.id);
  const staleClaim = claims.find((claim) => claim.id === stalePublishing.id);
  assert.ok(pendingClaim, 'PENDING delivery must be claimed for publishing');
  assert.ok(staleClaim, 'expired PUBLISHING delivery must be reclaimed');
  assert.equal(pendingClaim.attemptCount, 0);
  assert.equal(staleClaim.attemptCount, 0);
  assert.equal(staleClaim.publishLease, publishLease);

  for (const unrelated of claims.filter(
    (claim) => claim.id !== pending.id && claim.id !== stalePublishing.id,
  )) {
    await repository.releasePublishing(
      unrelated,
      'CAS_TEST_RELEASE',
      new Date(Date.now() + 60_000),
    );
  }

  const heartbeatAt = new Date();
  const leaseDeadline = new Date(heartbeatAt.getTime() + 90_000);
  assert.equal(
    await repository.heartbeatPublishing({
      deliveryId: pending.id,
      publishLease: 'pub:test:wrong-owner',
      now: heartbeatAt,
      leaseDeadline,
    }),
    false,
  );
  assert.equal(
    await repository.heartbeatPublishing({
      deliveryId: pending.id,
      publishLease,
      now: heartbeatAt,
      leaseDeadline,
    }),
    true,
  );
  const heartbeated = await prisma.notification_deliveries.findUniqueOrThrow({
    where: { id: pending.id },
    select: { status: true, locked_by: true, locked_at: true, next_attempt_at: true },
  });
  assert.equal(heartbeated.status, 'PUBLISHING');
  assert.equal(heartbeated.locked_by, publishLease);
  assert.equal(heartbeated.locked_at?.getTime(), heartbeatAt.getTime());
  assert.equal(heartbeated.next_attempt_at?.getTime(), leaseDeadline.getTime());

  assert.equal(
    await repository.claimPublished({
      deliveryId: pending.id,
      eventId: pendingEventId,
      channel: 'EMAIL',
      publishLease: 'pub:test:wrong-owner',
      consumerLease,
    }),
    null,
  );
  const consumerClaim = await repository.claimPublished({
    deliveryId: pending.id,
    eventId: pendingEventId,
    channel: 'EMAIL',
    publishLease,
    consumerLease,
  });
  assert.ok(consumerClaim, 'consumer CAS must claim the publisher-owned delivery');
  assert.equal(consumerClaim.attemptCount, 1);
  assert.equal(
    await repository.claimPublished({
      deliveryId: pending.id,
      eventId: pendingEventId,
      channel: 'EMAIL',
      publishLease,
      consumerLease: `con:test:duplicate:${randomUUID()}`,
    }),
    null,
    'duplicate consumer CAS must not increment attempt_count',
  );

  assert.equal(
    await repository.heartbeatPublishing({
      deliveryId: pending.id,
      publishLease,
      now: new Date(),
      leaseDeadline: new Date(Date.now() + 90_000),
    }),
    false,
    'publisher heartbeat must stop after consumer CAS wins',
  );
  assert.equal(
    await repository.heartbeatProcessing({
      deliveryId: pending.id,
      consumerLease,
      now: new Date(),
    }),
    true,
  );

  await prisma.notification_deliveries.update({
    where: { id: pending.id },
    data: { locked_at: new Date(Date.now() - 600_000) },
  });
  assert.equal(
    await repository.reclaimStaleProcessing(
      'EMAIL',
      new Date(Date.now() - 300_000),
      1000,
    ) > 0,
    true,
  );
  const reclaimed = await prisma.notification_deliveries.findUniqueOrThrow({
    where: { id: pending.id },
    select: { status: true, attempt_count: true, locked_by: true },
  });
  assert.equal(reclaimed.status, 'PENDING');
  assert.equal(reclaimed.attempt_count, 1);
  assert.equal(reclaimed.locked_by, null);
});
