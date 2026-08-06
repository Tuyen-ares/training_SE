export interface NotificationDto {
  id: number;
  recipientUserId: number;
  notificationType: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationListQuery {
  page: number;
  pageSize: number;
  isRead?: boolean;
}

export interface NotificationPage {
  items: NotificationDto[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
}

export interface CreateNotificationInput {
  recipientUserId: number;
  notificationType: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
}
