import { z } from 'zod';
import type { Request, Response } from 'express';
import { ASSET_ISSUE_STATUSES } from '@/models/asset-issue.model.js';
import type { AssetIssueService } from '@/services/asset-issue.service.js';
import { AssetIssueError, MediaError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ASSET_ISSUE_STATUSES).optional(),
  assetId: z.coerce.number().int().positive().optional(),
});

const optionalNoteSchema = z.strictObject({
  note: z.string().trim().min(1).max(300).optional(),
});

const repairFields = {
  vendorId: z.number().int().positive().nullable().optional(),
  cost: z.number().min(0).max(9999999999.99).nullable().optional(),
  result: z.string().trim().min(1).max(300).nullable().optional(),
  note: z.string().trim().min(1).max(300).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
};

const repairStartSchema = z.strictObject(repairFields);
const repairUpdateSchema = repairStartSchema.refine((value) => Object.keys(value).length > 0, {
  message: 'At least one repair field is required',
});
const repairCloseSchema = repairStartSchema.extend({
  result: z.string().trim().min(1).max(300),
  mediaIds: z.array(z.number().int().positive()).max(10).refine((ids) => new Set(ids).size === ids.length, {
    message: 'Media IDs must be unique',
  }).optional(),
});

function positiveId(value: string | string[] | undefined): number | null {
  const id = Number(typeof value === 'string' ? value : '');
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleIssueError(error: unknown, res: Response): void {
  if (error instanceof MediaError) {
    if (error.code === 'MEDIA_FORBIDDEN') return ApiResponse.forbidden(res, 'You do not have access to this media');
    if (error.code === 'MEDIA_CONFIG_MISSING' || error.code === 'MEDIA_STORAGE_ACCESS' || error.code === 'MEDIA_STORAGE_UNAVAILABLE') {
      return ApiResponse.serviceUnavailable(res, 'Media storage is currently unavailable');
    }
    return ApiResponse.badRequest(res, { mediaIds: [error.message] });
  }
  if (!(error instanceof AssetIssueError)) return ApiResponse.internalError(res);
  if (error.code === 'ISSUE_NOT_FOUND' || error.code === 'ASSET_NOT_FOUND') {
    return ApiResponse.notFound(res, 'Asset issue not found');
  }
  if (error.code === 'REPORT_FORBIDDEN') return ApiResponse.forbidden(res);
  if (error.code === 'VENDOR_PERMISSION_REQUIRED') {
    return ApiResponse.forbidden(res, 'vendor.view is required to change the repair vendor');
  }
  if (error.code === 'VENDOR_NOT_FOUND') return ApiResponse.conflict(res, 'Vendor does not exist');
  if (error.code === 'VENDOR_INACTIVE') return ApiResponse.conflict(res, 'Inactive vendors cannot be assigned to new repairs');
  return ApiResponse.conflict(res, 'Asset issue is not in a valid state for this action');
}

export class AssetIssueController {
  constructor(private readonly service: AssetIssueService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid issue query'] });
    try {
      return ApiResponse.ok(res, await this.service.list(parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = positiveId(req.params.id);
    if (!id) return ApiResponse.badRequest(res, { id: ['A positive issue id is required'] });
    try {
      return ApiResponse.ok(res, await this.service.getById(id));
    } catch (error) {
      return handleIssueError(error, res);
    }
  };

  confirm = (req: Request, res: Response): Promise<void> =>
    this.run(req, res, (id, actorId) => this.service.confirm(id, actorId));

  reject = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(optionalNoteSchema, req.body ?? {});
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    return this.run(req, res, (id, actorId) => this.service.reject(id, actorId, parsed.data.note));
  };

  startRepair = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(repairStartSchema, req.body ?? {});
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    return this.run(req, res, (id, actorId, permissionCodes) => this.service.startRepair(id, actorId, permissionCodes, parsed.data));
  };

  updateRepair = async (req: Request, res: Response): Promise<void> => {
    const id = positiveId(req.params.id);
    if (!id) return ApiResponse.badRequest(res, { id: ['A positive issue id is required'] });
    const parsed = parseRequestBody(repairUpdateSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      if (!req.auth) return ApiResponse.unauthorized(res);
      return ApiResponse.ok(res, await this.service.updateRepair(id, parsed.data, req.auth.permissionCodes));
    } catch (error) {
      return handleIssueError(error, res);
    }
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(repairCloseSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    return this.run(req, res, (id, actorId, permissionCodes) =>
      this.service.finishRepair(
        id,
        actorId,
        'COMPLETED',
        permissionCodes,
        parsed.data,
        parsed.data.mediaIds,
      ));
  };

  fail = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(repairUpdateSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    return this.run(req, res, (id, actorId, permissionCodes) =>
      this.service.finishRepair(id, actorId, 'FAILED', permissionCodes, parsed.data));
  };

  private run = async (
    req: Request,
    res: Response,
    action: (id: number, actorId: number, permissionCodes: string[]) => Promise<unknown>,
  ): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const id = positiveId(req.params.id);
    if (!id) return ApiResponse.badRequest(res, { id: ['A positive issue id is required'] });
    try {
      return ApiResponse.ok(res, await action(id, req.auth.sub, req.auth.permissionCodes));
    } catch (error) {
      return handleIssueError(error, res);
    }
  };
}
