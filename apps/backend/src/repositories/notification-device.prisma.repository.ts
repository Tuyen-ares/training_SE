import { createHash } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  NotificationDeviceDto,
  NotificationDeviceToken,
  RegisterNotificationDeviceInput,
} from '@/models/notification-device.model.js';
import type { INotificationDeviceRepository } from '@/repositories/notification-device.repository.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function mapDevice(row: any): NotificationDeviceDto {
  return {
    id: row.id,
    provider: 'FCM',
    platform: 'WEB',
    isActive: row.is_active,
    failureCount: row.failure_count,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PrismaNotificationDeviceRepository
  implements INotificationDeviceRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async upsertWebToken(
    userId: number,
    input: RegisterNotificationDeviceInput,
  ): Promise<NotificationDeviceDto> {
    const token = input.token.trim();
    const tokenHash = hashToken(token);
    const row = await this.prisma.notification_devices.upsert({
      where: { token_hash: tokenHash },
      create: {
        user_id: userId,
        provider: 'FCM',
        token_hash: tokenHash,
        token,
        platform: 'WEB',
        user_agent: input.userAgent ?? null,
      },
      update: {
        user_id: userId,
        token,
        platform: 'WEB',
        user_agent: input.userAgent ?? null,
        last_seen_at: new Date(),
        is_active: true,
        failure_count: 0,
        last_error: null,
      },
    });
    return mapDevice(row);
  }

  async findOwn(userId: number): Promise<NotificationDeviceDto[]> {
    const rows = await this.prisma.notification_devices.findMany({
      where: { user_id: userId, provider: 'FCM', platform: 'WEB' },
      orderBy: [{ last_seen_at: 'desc' }, { id: 'desc' }],
    });
    return rows.map(mapDevice);
  }

  listActiveTokens(userId: number): Promise<NotificationDeviceToken[]> {
    return this.prisma.notification_devices.findMany({
      where: {
        user_id: userId,
        provider: 'FCM',
        platform: 'WEB',
        is_active: true,
      },
      select: { id: true, token: true },
      orderBy: { id: 'asc' },
    });
  }

  async deactivateToken(id: number, errorCode: string): Promise<boolean> {
    const result = await this.prisma.notification_devices.updateMany({
      where: { id, provider: 'FCM', platform: 'WEB', is_active: true },
      data: {
        is_active: false,
        failure_count: { increment: 1 },
        last_error: errorCode.slice(0, 2000),
      },
    });
    return result.count === 1;
  }

  async deleteOwn(userId: number, id: number): Promise<boolean> {
    const result = await this.prisma.notification_devices.deleteMany({
      where: { id, user_id: userId, provider: 'FCM', platform: 'WEB' },
    });
    return result.count === 1;
  }
}
