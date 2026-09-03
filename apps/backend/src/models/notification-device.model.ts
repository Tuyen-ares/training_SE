export interface RegisterNotificationDeviceInput {
  token: string;
  platform: 'WEB';
  userAgent?: string | null;
}

export interface NotificationDeviceDto {
  id: number;
  provider: 'FCM';
  platform: 'WEB';
  isActive: boolean;
  failureCount: number;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDeviceToken {
  id: number;
  token: string;
}
