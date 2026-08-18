import { z } from 'zod';
import type { Request, Response } from 'express';
import type { MediaService } from '@/services/media.service.js';
import { MediaError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const purposeSchema = z.enum(['HANDOVER', 'RETURN', 'AFTER_REPAIR', 'ASSET_IMAGE', 'USER_AVATAR']);
const presignSchema = z.strictObject({
  purpose: purposeSchema,
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

function positiveId(value: string | string[] | undefined): number | null {
  const id = Number(typeof value === 'string' ? value : '');
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleMediaError(error: unknown, res: Response): void {
  if (!(error instanceof MediaError)) return ApiResponse.internalError(res);
  if (error.code === 'MEDIA_CONFIG_MISSING') return ApiResponse.serviceUnavailable(res, 'Media storage is not configured');
  if (error.code === 'MEDIA_FORBIDDEN') return ApiResponse.forbidden(res);
  if (error.code === 'MEDIA_NOT_FOUND' || error.code === 'MEDIA_VERIFY_NOT_FOUND') {
    return ApiResponse.notFound(res, error.code === 'MEDIA_VERIFY_NOT_FOUND' ? 'Uploaded object could not be verified' : 'Media not found');
  }
  if (error.code === 'MEDIA_ALREADY_LINKED') return ApiResponse.conflict(res, 'Linked media cannot be cancelled');
  if (error.code === 'MEDIA_STORAGE_ACCESS' || error.code === 'MEDIA_STORAGE_UNAVAILABLE') {
    return ApiResponse.serviceUnavailable(res, 'Media storage is temporarily unavailable');
  }
  return ApiResponse.badRequest(res, { media: [error.message] });
}

export class MediaController {
  constructor(private readonly service: MediaService) {}

  presign = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = parseRequestBody(presignSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      return ApiResponse.created(res, await this.service.presign(parsed.data, req.auth.sub, req.auth.permissionCodes));
    } catch (error) {
      return handleMediaError(error, res);
    }
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const mediaId = positiveId(req.params.mediaId);
    if (!mediaId) return ApiResponse.badRequest(res, { mediaId: ['Media ID must be a positive integer'] });
    try {
      return ApiResponse.ok(res, await this.service.complete(mediaId, req.auth.sub));
    } catch (error) {
      return handleMediaError(error, res);
    }
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const mediaId = positiveId(req.params.mediaId);
    if (!mediaId) return ApiResponse.badRequest(res, { mediaId: ['Media ID must be a positive integer'] });
    try {
      await this.service.cancel(mediaId, req.auth.sub);
      return ApiResponse.noContent(res);
    } catch (error) {
      return handleMediaError(error, res);
    }
  };
}
