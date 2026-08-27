import type {
  NotificationDto,
  NotificationListQuery,
  NotificationPage,
} from '@/models/notification.model.js';
import type {
  INotificationRepository,
} from '@/repositories/notification.repository.js';
import type { PrismaClient } from '../../generated/prisma/index.js';

function mapNotification(value: any): NotificationDto {
  return {
    id: value.id,
    recipientUserId: value.recipient_user_id,
    notificationType: value.notification_type,
    title: value.title,
    message: value.message,
    relatedEntityType: value.related_entity_type,
    relatedEntityId: value.related_entity_id,
    isRead: value.is_read,
    readAt: value.read_at,
    createdAt: value.created_at,
  };
}

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOwnPage(userId: number, query: NotificationListQuery): Promise<NotificationPage> {
    const where = {
      recipient_user_id: userId,
      ...(query.isRead === undefined ? {} : { is_read: query.isRead }),
    };
    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notifications.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.count({
        where: { recipient_user_id: userId, is_read: false },
      }),
    ]);
    return {
      items: items.map(mapNotification),
      page: query.page,
      pageSize: query.pageSize,
      total,
      unreadCount,
    };
  }

  unreadCount(userId: number): Promise<number> {
    return this.prisma.notifications.count({
      where: { recipient_user_id: userId, is_read: false },
    });
  }

  async markRead(userId: number, id: number): Promise<NotificationDto | null> {
    const existing = await this.prisma.notifications.findFirst({
      where: { id, recipient_user_id: userId },
    });
    if (!existing) return null;
    if (existing.is_read) return mapNotification(existing);
    const result = await this.prisma.notifications.updateMany({
      where: { id, recipient_user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    if (result.count !== 1) return null;
    const notification = await this.prisma.notifications.findUnique({ where: { id } });
    return notification ? mapNotification(notification) : null;
  }

  async markAllRead(userId: number): Promise<number> {
    const result = await this.prisma.notifications.updateMany({
      where: { recipient_user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return result.count;
  }

}
