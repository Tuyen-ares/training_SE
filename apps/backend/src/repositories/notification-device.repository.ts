import type {
  NotificationDeviceDto,
  NotificationDeviceToken,
  RegisterNotificationDeviceInput,
} from '@/models/notification-device.model.js';

export interface INotificationDeviceRepository {
  upsertWebToken(
    userId: number,
    input: RegisterNotificationDeviceInput,
  ): Promise<NotificationDeviceDto>;
  findOwn(userId: number): Promise<NotificationDeviceDto[]>;
  listActiveTokens(userId: number): Promise<NotificationDeviceToken[]>;
  deactivateToken(id: number, errorCode: string): Promise<boolean>;
  deleteOwn(userId: number, id: number): Promise<boolean>;
}
