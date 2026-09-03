import type {
  NotificationDeviceDto,
  RegisterNotificationDeviceInput,
} from '@/models/notification-device.model.js';
import type { INotificationDeviceRepository } from '@/repositories/notification-device.repository.js';

export class NotificationDeviceService {
  constructor(private readonly repository: INotificationDeviceRepository) {}

  register(
    userId: number,
    input: RegisterNotificationDeviceInput,
  ): Promise<NotificationDeviceDto> {
    return this.repository.upsertWebToken(userId, input);
  }

  listOwn(userId: number): Promise<NotificationDeviceDto[]> {
    return this.repository.findOwn(userId);
  }

  remove(userId: number, id: number): Promise<boolean> {
    return this.repository.deleteOwn(userId, id);
  }
}
