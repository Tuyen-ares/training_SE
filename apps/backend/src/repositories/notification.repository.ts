import type {
  CreateNotificationInput,
  NotificationDto,
  NotificationListQuery,
  NotificationPage,
} from '@/models/notification.model.js';
import type { Prisma } from '../../generated/prisma/index.js';

export type NotificationTransaction = Pick<Prisma.TransactionClient, 'notifications'>;

export interface INotificationRepository {
  findOwnPage(userId: number, query: NotificationListQuery): Promise<NotificationPage>;
  unreadCount(userId: number): Promise<number>;
  markRead(userId: number, id: number): Promise<NotificationDto | null>;
  markAllRead(userId: number): Promise<number>;
  create(input: CreateNotificationInput, transaction?: NotificationTransaction): Promise<NotificationDto>;
  findActiveUserIdsByPermissions(permissionCodes: string[]): Promise<number[]>;
}
