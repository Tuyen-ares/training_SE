import { z } from 'zod';
import type { Request, Response } from 'express';
import type { NotificationService } from '@/services/notification.service.js';
import { ApiResponse } from '@/shared/api-response.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.enum(['true', 'false']).optional().transform((value) =>
    value === undefined ? undefined : value === 'true'),
});

function positiveId(value: string | string[] | undefined): number | null {
  const id = Number(typeof value === 'string' ? value : '');
  return Number.isInteger(id) && id > 0 ? id : null;
}

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  listOwn = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid notification query'] });
    try {
      return ApiResponse.ok(res, await this.service.listOwn(req.auth.sub, parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  unreadCount = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    try {
      return ApiResponse.ok(res, await this.service.getUnreadCount(req.auth.sub));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const id = positiveId(req.params.id);
    if (!id) return ApiResponse.badRequest(res, { id: ['A positive notification id is required'] });
    try {
      const notification = await this.service.markRead(req.auth.sub, id);
      if (!notification) return ApiResponse.notFound(res, 'Notification not found');
      return ApiResponse.ok(res, notification);
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    try {
      return ApiResponse.ok(res, await this.service.markAllRead(req.auth.sub));
    } catch {
      return ApiResponse.internalError(res);
    }
  };
}
