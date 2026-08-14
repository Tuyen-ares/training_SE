import type {
  CreateNotificationInput,
  NotificationDto,
  NotificationListQuery,
  NotificationPage,
} from '@/models/notification.model.js';
import type { INotificationRepository } from '@/repositories/notification.repository.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export class NotificationService {
  constructor(private readonly repository: INotificationRepository) {}

  listOwn(userId: number, query: NotificationListQuery): Promise<NotificationPage> {
    return this.repository.findOwnPage(userId, query);
  }

  async getUnreadCount(userId: number): Promise<{ unreadCount: number }> {
    return { unreadCount: await this.repository.unreadCount(userId) };
  }

  markRead(userId: number, id: number): Promise<NotificationDto | null> {
    return this.repository.markRead(userId, id);
  }

  async markAllRead(userId: number): Promise<{ updatedCount: number }> {
    return { updatedCount: await this.repository.markAllRead(userId) };
  }

  createInTransaction(
    input: CreateNotificationInput,
    transaction: PrismaTransaction,
  ): Promise<NotificationDto> {
    return this.repository.create(input, transaction);
  }

  async notifyPermissionHoldersInTransaction(
    permissionCodes: string[],
    input: Omit<CreateNotificationInput, 'recipientUserId'>,
    excludedUserIds: number[] = [],
    transaction: PrismaTransaction,
  ): Promise<number> {
    const recipients = await this.repository.findActiveUserIdsByPermissions(permissionCodes, transaction);
    const excluded = new Set(excludedUserIds);
    const targetIds = recipients.filter((id) => !excluded.has(id));
    await Promise.all(targetIds.map((recipientUserId) =>
      this.repository.create({ ...input, recipientUserId }, transaction)));
    return targetIds.length;
  }
}
