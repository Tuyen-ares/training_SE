import type {
  NotificationDto,
  NotificationListQuery,
  NotificationPage,
} from '@/models/notification.model.js';

export interface INotificationRepository {
  findOwnPage(userId: number, query: NotificationListQuery): Promise<NotificationPage>;
  unreadCount(userId: number): Promise<number>;
  markRead(userId: number, id: number): Promise<NotificationDto | null>;
  markAllRead(userId: number): Promise<number>;
}
