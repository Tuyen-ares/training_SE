import { z } from 'zod';
import type { Request, Response } from 'express';
import type { NotificationDeviceService } from '@/services/notification-device.service.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const registerSchema = z.strictObject({
  token: z.string().trim().min(1).max(4096),
  platform: z.literal('WEB'),
  userAgent: z.string().trim().max(500).nullable().optional(),
});

function positiveId(value: string | string[] | undefined): number | null {
  const id = Number(typeof value === 'string' ? value : '');
  return Number.isInteger(id) && id > 0 ? id : null;
}

export class NotificationDeviceController {
  constructor(private readonly service: NotificationDeviceService) {}

  listOwn = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    try {
      return ApiResponse.ok(res, await this.service.listOwn(req.auth.sub));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  register = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = parseRequestBody(registerSchema, req.body);
    if (parsed.success === false)
      return ApiResponse.badRequest(res, parsed.errors);
    try {
      return ApiResponse.created(
        res,
        await this.service.register(req.auth.sub, parsed.data),
      );
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const id = positiveId(req.params.id);
    if (!id)
      return ApiResponse.badRequest(res, {
        id: ['A positive notification device id is required'],
      });
    try {
      if (!(await this.service.remove(req.auth.sub, id)))
        return ApiResponse.notFound(res, 'Notification device not found');
      return ApiResponse.noContent(res);
    } catch {
      return ApiResponse.internalError(res);
    }
  };
}
