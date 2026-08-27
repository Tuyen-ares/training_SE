import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DeliveryHandlerRegistry,
  DeliveryProcessor,
  type DeliveryHandler,
  InAppDeliveryHandler,
} from '@/notifications/delivery.js';
import {
  ConcurrencyLimiter,
  DeliveryLoop,
  NotificationRuntime,
  RetentionCleanupLoop,
  sanitizeError,
} from '@/notifications/runtime.js';
import {
  buildSmtpMessage,
  formatVietnamEmailDate,
  SmtpEmailDeliveryHandler,
  classifySmtpError,
  readSmtpConfig,
  type EmailProvider,
} from '@/notifications/smtp.js';
import {
  deterministicSmtpMessageId,
  NotificationTemplateCatalog,
} from '@/notifications/template-catalog.js';
import type {
  ClaimedDelivery,
  DeliveryRepository,
} from '@/notifications/repositories.js';
import { createNotificationRuntime } from '@/notifications/composition.js';
import {
  PrismaDeliveryRepository,
  PrismaOutboxRepository,
} from '@/notifications/prisma-repositories.js';

const claim: ClaimedDelivery = {
  id: 1n,
  eventId: 'event',
  recipientUserId: 2,
  channel: 'EMAIL',
  recipientAddress: 'snapshot@example.com',
  notificationId: null,
  notificationType: 'TYPE',
  title: 'Title',
  text: 'Text',
  relatedEntityType: null,
  relatedEntityId: null,
  outboundMessageId: '<fixed@bigin.local>',
  attemptCount: 1,
  leaseOwner: 'worker',
};
function repository(
  overrides: Partial<DeliveryRepository> = {},
): DeliveryRepository {
  return {
    claimDue: async () => [],
    isRecipientActive: async () => true,
    completeInApp: async () => true,
    markSent: async () => true,
    retry: async () => true,
    fail: async () => true,
    skip: async () => true,
    releasePending: async () => true,
    cleanup: async () => 0,
    ...overrides,
  };
}

test('registry selects handlers and rejects duplicate or missing registration', () => {
  const handler: DeliveryHandler = {
    channel: 'EMAIL',
    async process() {
      return { kind: 'SENT' };
    },
  };
  const registry = new DeliveryHandlerRegistry([handler]);
  assert.equal(registry.get('EMAIL'), handler);
  assert.throws(() => registry.register(handler), /DUPLICATE/);
  assert.throws(() => registry.get('IN_APP'), /UNSUPPORTED/);
});
test('processor applies retry schedule and fails after sixth attempt', async () => {
  let retryAt: Date | undefined,
    failed = false;
  const repo = repository({
    retry: async (_c, _e, date) => {
      retryAt = date;
      return true;
    },
    fail: async () => {
      failed = true;
      return true;
    },
  });
  const registry = new DeliveryHandlerRegistry([
    {
      channel: 'EMAIL',
      async process() {
        return { kind: 'RETRY', error: 'temporary' };
      },
    },
  ]);
  const processor = new DeliveryProcessor(repo, registry, String);
  const before = Date.now();
  await processor.process(claim);
  assert.ok(retryAt!.getTime() >= before + 29_000);
  await processor.process({ ...claim, attemptCount: 6 });
  assert.equal(failed, true);
});
test('SMTP uses only snapshot fields and the outbound Message-ID', async () => {
  let sent: any;
  const provider: EmailProvider = {
    async send(input) {
      sent = input;
      return { providerMessageId: 'provider-id' };
    },
    async close() {},
  };
  const outcome = await new SmtpEmailDeliveryHandler(
    provider,
    true,
    String,
  ).process(claim);
  assert.equal(outcome.kind, 'SENT');
  assert.equal(sent.to, 'snapshot@example.com');
  assert.equal(sent.messageId, '<fixed@bigin.local>');
  assert.equal(deterministicSmtpMessageId('abc', 4), '<abc.4@bigin.local>');
});
test('SMTP renders structured message payload at send time', async () => {
  let sent: any;
  const provider: EmailProvider = {
    async send(input) {
      sent = input;
      return {};
    },
    async close() {},
  };
  const outcome = await new SmtpEmailDeliveryHandler(
    provider,
    true,
    String,
  ).process({
    ...claim,
    eventType: 'borrow_request_detail.approved',
    templateVersion: 1,
    messagePayload: {
      title: 'Structured title',
      message: 'Structured text',
      deepLink: 'https://bigin.test/borrow-requests/7',
    },
  });
  assert.equal(outcome.kind, 'SENT');
  assert.equal(sent.subject, 'Structured title');
  assert.equal(sent.text, 'Structured text');
  assert.match(sent.html, /Structured title/);
  assert.match(sent.html, /borrow-requests\/7/);
  assert.match(sent.html, /View in BigIn Asset/);
  assert.doesNotMatch(
    sent.html,
    /You can review the request and complete the next action in BigIn Asset/,
  );
});
test('SMTP rebuilds legacy delivery content without stored HTML', async () => {
  let sent: any;
  const provider: EmailProvider = {
    async send(input) {
      sent = input;
      return {};
    },
    async close() {},
  };
  const outcome = await new SmtpEmailDeliveryHandler(
    provider,
    true,
    String,
  ).process(claim);
  assert.equal(outcome.kind, 'SENT');
  assert.equal(sent.subject, 'Title');
  assert.equal(sent.text, 'Text');
  assert.match(sent.html, /Title/);
  assert.match(sent.html, /Text/);
});
test('SMTP Date header uses the Vietnam business timezone', () => {
  const now = new Date('2026-08-26T00:00:00.000Z');
  assert.equal(
    formatVietnamEmailDate(now),
    'Wed, 26 Aug 2026 07:00:00 +0700',
  );
  assert.equal(
    buildSmtpMessage(
      { from: 'from@example.test' },
      {
        to: 'to@example.test',
        subject: 'Subject',
        text: 'Text',
        html: null,
        messageId: '<message@example.test>',
      },
      now,
    ).date,
    'Wed, 26 Aug 2026 07:00:00 +0700',
  );
});
test('SMTP disabled, missing config and provider errors follow policy', async () => {
  assert.deepEqual(
    await new SmtpEmailDeliveryHandler(null, false, String).process(claim),
    { kind: 'SKIPPED', reason: 'SMTP_DISABLED' },
  );
  assert.deepEqual(readSmtpConfig({ SMTP_ENABLED: 'true' }), {
    state: 'MISCONFIGURED',
    error: 'SMTP_HOST_REQUIRED',
  });
  assert.equal(
    classifySmtpError({ code: 'EAUTH' }, String).kind,
    'RELEASE_AND_ABORT',
  );
  assert.equal(classifySmtpError({ responseCode: 450 }, String).kind, 'RETRY');
  assert.equal(classifySmtpError({ responseCode: 550 }, String).kind, 'FAILED');
  assert.equal(classifySmtpError({ code: 'UNKNOWN' }, String).kind, 'RETRY');
});
test('error sanitizer redacts credentials without changing ordinary messages', () => {
  const dirty =
    'Authorization: Bearer abc.def password=hunter2 token: "secret token" api_key=key https://alice:p%40ss@smtp.test/path Basic dXNlcjpwYXNz';
  const clean = sanitizeError(dirty);
  assert.doesNotMatch(clean, /abc\.def|hunter2|secret token|p%40ss|dXNlcjpwYXNz|alice/);
  assert.match(clean, /Bearer \[REDACTED\]/);
  assert.match(clean, /https:\/\/\[REDACTED\]:\[REDACTED\]@smtp\.test/);
  assert.equal(sanitizeError(new Error('connection timed out')), 'connection timed out');
  assert.equal(sanitizeError('x'.repeat(2_100)).length, 2_000);
});
test('SMTP config validates states, port, boolean and auth pairs', () => {
  assert.deepEqual(readSmtpConfig({}), { state: 'DISABLED' });
  const base = { SMTP_ENABLED: 'true', SMTP_HOST: 'smtp.test', SMTP_FROM: 'from@test.local' };
  assert.deepEqual(readSmtpConfig(base), {
    state: 'READY',
    config: {
      host: 'smtp.test',
      port: 587,
      secure: false,
      user: undefined,
      password: undefined,
      from: 'from@test.local',
    },
  });
  for (const SMTP_PORT of ['0', '65536', '1.5', 'not-a-number'])
    assert.equal(readSmtpConfig({ ...base, SMTP_PORT }).state, 'MISCONFIGURED');
  assert.deepEqual(readSmtpConfig({ ...base, SMTP_SECURE: 'yes' }), {
    state: 'MISCONFIGURED',
    error: 'SMTP_SECURE_INVALID',
  });
  assert.equal(
    readSmtpConfig({ ...base, SMTP_USER: 'user' }).state,
    'MISCONFIGURED',
  );
  assert.equal(
    readSmtpConfig({ ...base, SMTP_PASSWORD: 'password' }).state,
    'MISCONFIGURED',
  );
});
test('email loop is omitted only for misconfigured SMTP', async () => {
  const prisma = {} as any;
  const disabled = createNotificationRuntime(prisma, {
    SMTP_ENABLED: 'false',
    NOTIFICATION_CLEANUP_ENABLED: 'false',
  });
  const originalError = console.error;
  console.error = () => {};
  const misconfigured = createNotificationRuntime(prisma, {
    SMTP_ENABLED: 'true',
    NOTIFICATION_CLEANUP_ENABLED: 'false',
  });
  const ready = createNotificationRuntime(prisma, {
    SMTP_ENABLED: 'true',
    SMTP_HOST: 'smtp.test',
    SMTP_FROM: 'from@test.local',
    NOTIFICATION_CLEANUP_ENABLED: 'false',
  });
  console.error = originalError;
  assert.equal((disabled as any).loops.length, 3);
  assert.equal((misconfigured as any).loops.length, 2);
  assert.equal((ready as any).loops.length, 3);
  await disabled.stop();
  await misconfigured.stop();
  await ready.stop();
});
test('batch claims execute one bulk update for one hundred rows', async () => {
  const ids = Array.from({ length: 100 }, (_, index) => ({ id: BigInt(index + 1) }));
  let outboxUpdates = 0;
  let deliveryUpdates = 0;
  const tx = {
    $queryRaw: async () => ids,
    outbox_events: {
      updateMany: async () => {
        outboxUpdates++;
        return { count: 100 };
      },
      findMany: async () => ids.map(({ id }) => ({ id, dispatch_attempt_count: 1 })),
    },
    notification_deliveries: {
      updateMany: async () => {
        deliveryUpdates++;
        return { count: 100 };
      },
      findMany: async () =>
        ids.map(({ id }) => ({ id, event_id: `event-${id}`, attempt_count: 1 })),
    },
  };
  const prisma = { $transaction: async (work: any) => work(tx) } as any;
  assert.equal(
    (await new PrismaOutboxRepository(prisma).claimDue({
      workerId: 'worker', limit: 100, staleBefore: new Date(0),
    })).length,
    100,
  );
  assert.equal(
    (await new PrismaDeliveryRepository(prisma).claimDue({
      workerId: 'worker', channel: 'EMAIL', limit: 100, staleBefore: new Date(0),
    })).length,
    100,
  );
  assert.equal(outboxUpdates, 1);
  assert.equal(deliveryUpdates, 1);
});
test('in-app handler delegates atomic completion and reports lost lease', async () => {
  assert.equal(
    (
      await new InAppDeliveryHandler(repository()).process({
        ...claim,
        channel: 'IN_APP',
      })
    ).kind,
    'SENT',
  );
  assert.equal(
    (
      await new InAppDeliveryHandler(
        repository({ completeInApp: async () => false }),
      ).process({ ...claim, channel: 'IN_APP' })
    ).kind,
    'FAILED',
  );
});
test('shared limiter never exceeds configured concurrency', async () => {
  const limiter = new ConcurrencyLimiter(3);
  let peak = 0;
  let releases: Array<() => void> = [];
  const tasks = Array.from({ length: 10 }, () =>
    limiter.run(async () => {
      peak = Math.max(peak, limiter.activeCount);
      await new Promise<void>((resolve) => releases.push(resolve));
    }),
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(peak, 3);
  while (releases.length) {
    const batch = releases;
    releases = [];
    batch.forEach((release) => release());
    await new Promise((resolve) => setImmediate(resolve));
  }
  await Promise.all(tasks);
  assert.equal(peak, 3);
});
test('cleanup runOnce uses terminal retention windows and batch 500', async () => {
  let deliveryLimit = 0,
    outboxLimit = 0;
  const loop = new RetentionCleanupLoop(
    {
      cleanup: async (_before, limit) => {
        outboxLimit = limit;
        return 0;
      },
    } as any,
    {
      cleanup: async (_before, limit) => {
        deliveryLimit = limit;
        return 0;
      },
    } as any,
  );
  await loop.runOnce();
  assert.equal(deliveryLimit, 500);
  assert.equal(outboxLimit, 500);
});
test('template catalog rejects unsupported versions and escapes HTML', () => {
  const catalog = new NotificationTemplateCatalog();
  const branded = new NotificationTemplateCatalog('https://cdn.example.test/logo.svg').render(
    'borrow_request.created',
    1,
    { title: 'Title', message: 'Message' },
    null,
  );
  assert.match(branded.html, /cdn\.example\.test\/logo\.svg/);
  assert.match(branded.html, /BigIn Asset/);
  const rendered = catalog.render(
    'borrow_request.created',
    1,
    { title: '<Title>', message: 'A & B' },
    'https://example.test/?a=1&b=2',
  );
  assert.match(rendered.html, /&lt;Title&gt;/);
  assert.match(rendered.html, /A &amp; B/);
  assert.throws(
    () =>
      catalog.render(
        'borrow_request.created',
        2,
        { title: 'x', message: 'y' },
        null,
      ),
    /UNSUPPORTED_TEMPLATE/,
  );
});
test('rich approval template includes business snapshot and Vietnam dates', () => {
  const rendered = new NotificationTemplateCatalog().render(
    'borrow_request_detail.approved',
    1,
    {
      requesterName: 'Nguyen Van A',
      actorName: 'Tran Van B',
      requestId: 123,
      detailId: 9,
      assetId: 10,
      assetCode: 'LAP-001',
      assetModelName: 'Dell Latitude 5440',
      expectedReturnDate: '2026-08-30T00:00:00.000Z',
      occurredAt: '2026-08-25T08:02:00.000Z',
    },
    'https://app.example.test/borrow-requests/123',
  );
  assert.match(rendered.text, /Hello Nguyen Van A/);
  assert.match(rendered.text, /Dell Latitude 5440 – LAP-001/);
  assert.match(rendered.text, /approved by Tran Van B/);
  assert.match(rendered.text, /15:02 25 August 2026/);
  assert.match(rendered.text, /30 August 2026/);
  assert.match(rendered.html, /View in BigIn Asset/);
});
test('rich rejection and issue templates include reasons and repair fields safely', () => {
  const catalog = new NotificationTemplateCatalog();
  const rejected = catalog.render(
    'borrow_request_detail.rejected',
    1,
    {
      requesterName: '<Nguyen>',
      actorName: 'Reviewer',
      requestId: 123,
      assetCode: 'LAP-001',
      assetModelName: 'Latitude',
      occurredAt: '2026-08-26T00:00:00.000Z',
      rejectionReason: 'Budget < approved & pending',
    },
    null,
  );
  assert.match(rejected.text, /Rejection reason: Budget < approved & pending/);
  assert.match(rejected.html, /&lt;Nguyen&gt;/);
  assert.match(rejected.html, /Budget &lt; approved &amp; pending/);
  const issue = catalog.render(
    'asset_issue.repair_completed',
    1,
    {
      reporterName: 'Le Thi C',
      actorName: 'Do Van D',
      issueId: 77,
      assetCode: 'MON-007',
      assetModelName: 'Dell Monitor',
      issueDescription: 'Screen flickers',
      issueStatus: 'COMPLETED',
      issueResult: 'Panel replaced',
      issueNote: 'Verified after repair',
      occurredAt: '2026-08-26T00:00:00.000Z',
    },
    null,
  );
  assert.match(issue.text, /Hello Le Thi C/);
  assert.match(issue.text, /Description: Screen flickers/);
  assert.match(issue.text, /Result: Panel replaced/);
  assert.match(issue.text, /Note: Verified after repair/);
});
test('email auth aborts the remaining batch and activates cooldown', async () => {
  const claims = Array.from({ length: 3 }, (_, index) => ({
    ...claim,
    id: BigInt(index + 1),
  }));
  let processed = 0;
  const repo = repository({ claimDue: async () => claims });
  const processor = {
    async process() {
      processed++;
      return { abortBatch: true, cooldownMs: 30_000 };
    },
  } as any;
  const loop = new DeliveryLoop(
    repo,
    processor,
    'EMAIL',
    'worker',
    1000,
    10,
    1000,
    1,
  );
  await loop.runOnce();
  assert.equal(processed, 1);
  assert.ok(loop.remainingCooldownMs > 29_000);
  await loop.runOnce();
  assert.equal(processed, 1);
});
test('ten pending SMTP promises do not block unrelated event-loop work', async () => {
  const claims = Array.from({ length: 10 }, (_, index) => ({
    ...claim,
    id: BigInt(index + 1),
  }));
  let started = 0;
  const releases: Array<() => void> = [];
  const repo = repository({ claimDue: async () => claims });
  const processor = {
    process: async () => {
      started++;
      await new Promise<void>((resolve) => releases.push(resolve));
      return { abortBatch: false };
    },
  } as any;
  const loop = new DeliveryLoop(
    repo,
    processor,
    'EMAIL',
    'worker',
    1000,
    20,
    1000,
    10,
  );
  const running = loop.runOnce();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 10);
  let responsive = false;
  await Promise.resolve().then(() => {
    responsive = true;
  });
  assert.equal(responsive, true);
  releases.forEach((release) => release());
  await running;
});
test('runtime stops claims, drains work, then closes resources', async () => {
  const calls: string[] = [];
  const loop = {
    start() {
      calls.push('start');
    },
    stopClaiming() {
      calls.push('stop');
    },
    async drain() {
      calls.push('drain');
    },
    async runOnce() {},
  };
  const runtime = new NotificationRuntime([loop], async () => {
    calls.push('close');
  });
  runtime.start(true);
  runtime.beginShutdown();
  await runtime.stop();
  assert.deepEqual(calls, ['start', 'stop', 'stop', 'drain', 'close']);
});
test('recursive scheduler removes completed timers instead of accumulating them', async () => {
  let calls = 0;
  const loop = new RetentionCleanupLoop(
    {
      cleanup: async () => {
        calls++;
        return 0;
      },
    } as any,
    { cleanup: async () => 0 } as any,
    5,
    500,
  );
  loop.start();
  await new Promise((resolve) => setTimeout(resolve, 24));
  loop.stopClaiming();
  await loop.drain();
  assert.ok(calls >= 2);
  assert.equal(loop.timerCount, 0);
});
