import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FcmInAppPushNotifier,
  type FcmBatchInput,
  type FcmProvider,
} from '@/notifications/fcm.js';
import { readFirebaseConfig } from '@/notifications/firebase-config.js';
import { InAppDeliveryHandler } from '@/notifications/delivery.js';
import type {
  ClaimedDelivery,
  DeliveryRepository,
} from '@/notifications/repositories.js';
import type { NotificationDeviceToken } from '@/models/notification-device.model.js';
import type { INotificationDeviceRepository } from '@/repositories/notification-device.repository.js';
import { PrismaNotificationDeviceRepository } from '@/repositories/notification-device.prisma.repository.js';

const claim: ClaimedDelivery = {
  id: 10n,
  eventId: 'event-1',
  correlationIdSnapshot: null,
  recipientUserId: 7,
  channel: 'IN_APP',
  recipientAddress: null,
  notificationId: null,
  messageId: 3n,
  eventType: 'borrow_request_detail.approved',
  templateVersion: 1,
  messagePayload: {
    deepLink: 'https://app.example.test/borrow-requests/123',
  },
  notificationType: 'BORROW_REQUEST_APPROVED',
  title: 'Borrow request approved',
  text: 'The asset has been approved.',
  relatedEntityType: 'BORROW_REQUEST',
  relatedEntityId: 123,
  outboundMessageId: null,
  attemptCount: 1,
  leaseOwner: 'worker-1',
};

function devices(
  tokens: readonly string[],
  overrides: Partial<INotificationDeviceRepository> = {},
): INotificationDeviceRepository {
  const rows: NotificationDeviceToken[] = tokens.map((token, index) => ({
    id: index + 1,
    token,
  }));
  return {
    upsertWebToken: async () => {
      throw new Error('NOT_USED');
    },
    findOwn: async () => [],
    listActiveTokens: async () => rows,
    deactivateToken: async () => true,
    deleteOwn: async () => false,
    ...overrides,
  };
}

function provider(
  send: (input: FcmBatchInput) => Promise<Awaited<ReturnType<FcmProvider['send']>>>,
): FcmProvider {
  return { send, close: async () => {} };
}

test('Firebase config is disabled, validated and never exposes a partial credential state', () => {
  assert.deepEqual(readFirebaseConfig({}), { state: 'DISABLED' });
  assert.deepEqual(readFirebaseConfig({ FIREBASE_ENABLED: 'true' }), {
    state: 'MISCONFIGURED',
    error: 'FIREBASE_SERVICE_ACCOUNT_INCOMPLETE',
  });
  assert.deepEqual(
    readFirebaseConfig({
      FIREBASE_ENABLED: 'true',
      FIREBASE_PROJECT_ID: 'bigin-test',
      FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@test.local',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nsecret\\n-----END PRIVATE KEY-----',
    }),
    {
      state: 'READY',
      config: {
        projectId: 'bigin-test',
        clientEmail: 'firebase-adminsdk@test.local',
        privateKey: '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----',
      },
    },
  );
});

test('FCM notifier sends a safe data payload with the notification snapshot', async () => {
  let sent: FcmBatchInput | undefined;
  const outcome = await new FcmInAppPushNotifier(
    devices(['token-a', 'token-b']),
    provider(async (input) => {
      sent = input;
      return {
        responses: input.tokens.map(() => ({
          success: true,
          messageId: 'provider-message',
        })),
      };
    }),
  ).send(claim, 99);

  assert.deepEqual(outcome, { kind: 'SENT' });
  assert.deepEqual(sent?.tokens, ['token-a', 'token-b']);
  assert.equal(sent?.title, claim.title);
  assert.equal(sent?.body, claim.text);
  assert.equal(sent?.data.eventId, 'event-1');
  assert.equal(sent?.data.notificationId, '99');
  assert.equal(sent?.data.deepLink, 'https://app.example.test/borrow-requests/123');
  assert.equal(sent?.link, 'https://app.example.test/borrow-requests/123');
});

test('FCM invalid registration tokens are deactivated and do not retry the in-app row', async () => {
  const deactivated: Array<{ id: number; code: string }> = [];
  const outcome = await new FcmInAppPushNotifier(
    devices(['invalid-a', 'invalid-b'], {
      deactivateToken: async (id, code) => {
        deactivated.push({ id, code });
        return true;
      },
    }),
    provider(async (input) => ({
      responses: input.tokens.map(() => ({
        success: false,
        errorCode: 'messaging/registration-token-not-registered',
      })),
    })),
  ).send(claim, 99);

  assert.deepEqual(outcome, { kind: 'SKIPPED', reason: 'FCM_NO_VALID_DEVICES' });
  assert.deepEqual(deactivated, [
    { id: 1, code: 'messaging/registration-token-not-registered' },
    { id: 2, code: 'messaging/registration-token-not-registered' },
  ]);
});

test('FCM transient provider failure returns retry while a partial success is treated as sent', async () => {
  const retry = await new FcmInAppPushNotifier(
    devices(['token-a']),
    provider(async () => {
      throw new Error('network unavailable');
    }),
  ).send(claim, 99);
  assert.deepEqual(retry, {
    kind: 'RETRY',
    error: 'FCM_PROVIDER_UNAVAILABLE',
  });

  const sent = await new FcmInAppPushNotifier(
    devices(['token-a', 'token-b']),
    provider(async (input) => ({
      responses: [
        { success: true, messageId: 'message-a' },
        { success: false, errorCode: 'messaging/server-unavailable' },
      ].slice(0, input.tokens.length),
    })),
  ).send(claim, 99);
  assert.deepEqual(sent, { kind: 'SENT' });
});

test('FCM batches more than five hundred devices without putting all tokens in one provider call', async () => {
  const calls: number[] = [];
  const tokens = Array.from({ length: 501 }, (_, index) => 'token-' + index);
  const outcome = await new FcmInAppPushNotifier(
    devices(tokens),
    provider(async (input) => {
      calls.push(input.tokens.length);
      return { responses: input.tokens.map(() => ({ success: true })) };
    }),
  ).send(claim, 99);

  assert.deepEqual(outcome, { kind: 'SENT' });
  assert.deepEqual(calls, [500, 1]);
});

test('in-app delivery persists its database notification before invoking FCM', async () => {
  const calls: string[] = [];
  const repository = {
    ensureInAppNotification: async () => {
      calls.push('persist');
      return 123;
    },
  } as DeliveryRepository;
  const notifier = {
    async send(_delivery: ClaimedDelivery, notificationId: number) {
      calls.push('push:' + notificationId);
      return { kind: 'SENT' as const };
    },
  };

  const outcome = await new InAppDeliveryHandler(repository, notifier).process(
    claim,
  );
  assert.deepEqual(outcome, { kind: 'SENT' });
  assert.deepEqual(calls, ['persist', 'push:123']);
});

test('device registration hashes the token and response metadata contains no raw token', async () => {
  let input: any;
  const repository = new PrismaNotificationDeviceRepository({
    notification_devices: {
      upsert: async (value: any) => {
        input = value;
        return {
          id: 4,
          is_active: true,
          failure_count: 0,
          last_seen_at: new Date('2026-08-31T00:00:00.000Z'),
          created_at: new Date('2026-08-31T00:00:00.000Z'),
          updated_at: new Date('2026-08-31T00:00:00.000Z'),
        };
      },
    },
  } as any);

  const result = await repository.upsertWebToken(7, {
    token: '  secret-token  ',
    platform: 'WEB',
    userAgent: 'Browser',
  });
  assert.equal(input.create.token, 'secret-token');
  assert.notEqual(input.create.token_hash, 'secret-token');
  assert.match(input.create.token_hash, /^[a-f0-9]{64}$/);
  assert.deepEqual(result, {
    id: 4,
    provider: 'FCM',
    platform: 'WEB',
    isActive: true,
    failureCount: 0,
    lastSeenAt: new Date('2026-08-31T00:00:00.000Z'),
    createdAt: new Date('2026-08-31T00:00:00.000Z'),
    updatedAt: new Date('2026-08-31T00:00:00.000Z'),
  });
});
