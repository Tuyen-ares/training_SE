import {
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import {
  getMessaging,
  type BatchResponse,
  type MulticastMessage,
} from 'firebase-admin/messaging';
import type { ClaimedDelivery } from '@/notifications/repositories.js';
import type { FirebaseRuntimeConfig } from '@/notifications/firebase-config.js';
import type { INotificationDeviceRepository } from '@/repositories/notification-device.repository.js';

const FIREBASE_APP_NAME = 'bigin-notifications';
const MAX_MULTICAST_TOKENS = 500;
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

export type FcmBatchInput = {
  tokens: readonly string[];
  title: string;
  body: string;
  data: Record<string, string>;
  link: string | null;
};

export type FcmBatchResult = {
  responses: Array<{
    success: boolean;
    messageId?: string;
    errorCode?: string;
  }>;
};

export interface FcmProvider {
  send(input: FcmBatchInput): Promise<FcmBatchResult>;
  close(): Promise<void>;
}

function buildMessage(input: FcmBatchInput): MulticastMessage {
  const message: MulticastMessage = {
    tokens: [...input.tokens],
    notification: { title: input.title, body: input.body },
    data: input.data,
  };
  if (input.link)
    message.webpush = {
      fcmOptions: { link: input.link },
    };
  return message;
}

export class FirebaseAdminFcmProvider implements FcmProvider {
  private readonly app: App;

  constructor(config: FirebaseRuntimeConfig) {
    const existing = getApps().find((app) => app.name === FIREBASE_APP_NAME);
    if (existing) {
      this.app = existing;
      return;
    }
    this.app = initializeApp(
      {
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
        projectId: config.projectId,
      },
      FIREBASE_APP_NAME,
    );
  }

  async send(input: FcmBatchInput): Promise<FcmBatchResult> {
    if (
      input.tokens.length < 1 ||
      input.tokens.length > MAX_MULTICAST_TOKENS
    )
      throw new Error('FCM_BATCH_SIZE_INVALID');
    const response: BatchResponse = await getMessaging(this.app).sendEachForMulticast(
      buildMessage(input),
    );
    return {
      responses: response.responses.map((item) => ({
        success: item.success,
        messageId: item.messageId,
        errorCode: item.error?.code,
      })),
    };
  }

  async close(): Promise<void> {
    // The named Firebase app is intentionally kept alive for the process lifetime.
  }
}

export type InAppPushOutcome =
  | { kind: 'SENT'; providerMessageId?: string }
  | { kind: 'SKIPPED'; reason: string }
  | { kind: 'RETRY'; error: string }
  | { kind: 'FAILED'; error: string };

export interface InAppPushNotifier {
  send(
    delivery: ClaimedDelivery,
    notificationId: number,
  ): Promise<InAppPushOutcome>;
}

function payloadRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeDeepLink(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    result.push([...items.slice(index, index + size)]);
  return result;
}

export class FcmInAppPushNotifier implements InAppPushNotifier {
  constructor(
    private readonly devices: INotificationDeviceRepository,
    private readonly provider: FcmProvider,
  ) {}

  async send(
    delivery: ClaimedDelivery,
    notificationId: number,
  ): Promise<InAppPushOutcome> {
    const devices = await this.devices.listActiveTokens(
      delivery.recipientUserId,
    );
    if (!devices.length)
      return { kind: 'SKIPPED', reason: 'FCM_NO_ACTIVE_DEVICES' };

    const payload = payloadRecord(delivery.messagePayload);
    const link = safeDeepLink(payload.deepLink);
    const data: Record<string, string> = {
      eventId: delivery.eventId,
      notificationId: String(notificationId),
      notificationType: delivery.notificationType,
    };
    if (delivery.relatedEntityType)
      data.relatedEntityType = delivery.relatedEntityType;
    if (delivery.relatedEntityId !== null)
      data.relatedEntityId = String(delivery.relatedEntityId);
    if (link) data.deepLink = link;

    let successCount = 0;
    let invalidTokenCount = 0;
    let retryableFailureCount = 0;
    for (const batch of chunks(devices, MAX_MULTICAST_TOKENS)) {
      let result: FcmBatchResult;
      try {
        result = await this.provider.send({
          tokens: batch.map((device) => device.token),
          title: delivery.title,
          body: delivery.text,
          data,
          link,
        });
      } catch {
        return successCount > 0
          ? { kind: 'SENT' }
          : { kind: 'RETRY', error: 'FCM_PROVIDER_UNAVAILABLE' };
      }

      for (const [index, response] of result.responses.entries()) {
        if (response.success) {
          successCount++;
          continue;
        }
        if (response.errorCode && INVALID_TOKEN_CODES.has(response.errorCode)) {
          invalidTokenCount++;
          try {
            await this.devices.deactivateToken(
              batch[index]?.id ?? 0,
              response.errorCode,
            );
          } catch {
            // The push outcome is already known. A bookkeeping failure must
            // not turn a successful/invalid batch into a duplicate retry.
          }
        } else retryableFailureCount++;
      }
    }

    if (successCount > 0) return { kind: 'SENT' };
    if (invalidTokenCount === devices.length)
      return { kind: 'SKIPPED', reason: 'FCM_NO_VALID_DEVICES' };
    if (retryableFailureCount > 0)
      return { kind: 'RETRY', error: 'FCM_PROVIDER_RETRYABLE_FAILURE' };
    return { kind: 'FAILED', error: 'FCM_PROVIDER_FAILURE' };
  }
}
