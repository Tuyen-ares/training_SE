import { z } from 'zod';
import type { Request, Response } from 'express';
import type { BorrowWorkflowService } from '@/services/borrow-workflow.service.js';
import { BorrowError, ConflictError, MediaError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const rejectDetailSchema = z.strictObject({
  rejectionReason: z.string().trim().min(1).max(300),
});

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const reviewQueueQuerySchema = pageQuerySchema.extend({
  approvalStatus: z.enum(['PENDING', 'ALL', 'APPROVED', 'REJECTED']).default('PENDING'),
});

const historyQuerySchema = pageQuerySchema.extend({
  state: z.enum(['ALL', 'CURRENT', 'RETURNED']).default('ALL'),
});

const activityQuerySchema = pageQuerySchema.extend({
  state: z.enum(['CURRENT', 'RETURNED']).default('CURRENT'),
});

const mediaIdsSchema = z
  .array(z.number().int().positive())
  .max(10)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Media IDs must be unique',
  });

const normalReturnSchema = z.strictObject({
  mediaIds: mediaIdsSchema.optional(),
});
const handoverSchema = z.strictObject({
  mediaIds: mediaIdsSchema.optional(),
});
const damagedReturnSchema = z.strictObject({
  description: z.string().trim().min(1).max(1000),
  mediaIds: mediaIdsSchema.optional(),
});

function readPositiveId(value: string | string[] | undefined): number | null {
  const id = Number(typeof value === 'string' ? value : '');
  return Number.isInteger(id) && id > 0 ? id : null;
}

export class BorrowWorkflowController {
  constructor(private readonly service: BorrowWorkflowService) {}

  private runAction = async (
    req: Request,
    res: Response,
    work: (actorId: number, targetId: number) => Promise<unknown>,
  ): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);

    const targetId = readPositiveId(req.params.detailId ?? req.params.historyId ?? req.params.requestId);
    if (!targetId) {
      return ApiResponse.badRequest(res, { id: ['A positive id is required'] });
    }

    try {
      return ApiResponse.ok(res, await work(req.auth.sub, targetId));
    } catch (error) {
      if (error instanceof BorrowError) {
        if (error.code === 'REQUEST_NOT_FOUND') {
          return ApiResponse.notFound(res, 'Borrow resource not found');
        }
        return ApiResponse.conflict(res, 'Borrow resource is not in a valid state');
      }
      if (error instanceof ConflictError) {
        return ApiResponse.conflict(res, error.message);
      }
      if (error instanceof MediaError) {
        if (error.code === 'MEDIA_FORBIDDEN') return ApiResponse.forbidden(res, 'You do not have access to this media');
        if (error.code === 'MEDIA_CONFIG_MISSING' || error.code === 'MEDIA_STORAGE_ACCESS' || error.code === 'MEDIA_STORAGE_UNAVAILABLE') {
          return ApiResponse.serviceUnavailable(res, 'Media storage is currently unavailable');
        }
        return ApiResponse.badRequest(res, { mediaIds: [error.message] });
      }
      return ApiResponse.internalError(res);
    }
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    return this.runAction(req, res, async (actorId, detailId) => {
      await this.service.approve(detailId, actorId);
      return { detailId, approvalStatus: 'APPROVED' };
    });
  };

  approveAll = async (req: Request, res: Response): Promise<void> => {
    return this.runAction(req, res, (actorId, requestId) =>
      this.service.approveAll(requestId, actorId),
    );
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(rejectDetailSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);

    return this.runAction(req, res, async (actorId, detailId) => {
      await this.service.reject(detailId, actorId, parsed.data.rejectionReason);
      return { detailId, approvalStatus: 'REJECTED' };
    });
  };

  handover = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(handoverSchema, req.body ?? {});
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);

    return this.runAction(req, res, async (actorId, detailId) => ({
      historyId: await this.service.handover(detailId, actorId, parsed.data.mediaIds),
    }));
  };

  returnNormal = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(normalReturnSchema, req.body ?? {});
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);

    return this.runAction(req, res, async (actorId, historyId) => {
      await this.service.returnNormal(historyId, actorId, parsed.data.mediaIds);
      return { historyId, returned: true };
    });
  };

  withdraw = async (req: Request, res: Response): Promise<void> => {
    return this.runAction(req, res, async (actorId, requestId) => {
      await this.service.withdraw(requestId, actorId);
      return { requestId, status: 'CANCELLED' };
    });
  };

  reviewQueue = async (req: Request, res: Response): Promise<void> => {
    const parsed = reviewQueueQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid pagination query'] });
    try {
      return ApiResponse.ok(res, await this.service.listReviewQueue(parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  handoverQueue = async (req: Request, res: Response): Promise<void> => {
    const parsed = pageQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid pagination query'] });
    try {
      return ApiResponse.ok(res, await this.service.listHandoverQueue(parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  handoverDetail = async (req: Request, res: Response): Promise<void> => {
    const requestId = readPositiveId(req.params.requestId);
    if (!requestId) return ApiResponse.badRequest(res, { requestId: ['A positive id is required'] });
    try {
      const request = await this.service.getHandoverQueueDetail(requestId);
      if (!request) return ApiResponse.notFound(res, 'Borrow request not found');
      return ApiResponse.ok(res, request);
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  returnQueue = async (req: Request, res: Response): Promise<void> => {
    const parsed = pageQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid pagination query'] });
    try {
      return ApiResponse.ok(res, await this.service.listReturnQueue(parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  returnDetail = async (req: Request, res: Response): Promise<void> => {
    const requestId = readPositiveId(req.params.requestId);
    if (!requestId) return ApiResponse.badRequest(res, { requestId: ['A positive id is required'] });
    try {
      const request = await this.service.getReturnQueueDetail(requestId);
      if (!request) return ApiResponse.notFound(res, 'Borrow request not found');
      return ApiResponse.ok(res, request);
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  reviewDetail = async (req: Request, res: Response): Promise<void> => {
    const requestId = readPositiveId(req.params.requestId);
    if (!requestId) {
      return ApiResponse.badRequest(res, { requestId: ['A positive id is required'] });
    }
    try {
      const request = await this.service.getReviewDetail(requestId);
      if (!request) return ApiResponse.notFound(res, 'Borrow request not found');
      return ApiResponse.ok(res, request);
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  current = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = pageQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid pagination query'] });
    try {
      return ApiResponse.ok(res, await this.service.listCurrent(req.auth.sub, parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  ownHistory = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid pagination query'] });
    try {
      return ApiResponse.ok(res, await this.service.listHistory(parsed.data, req.auth.sub));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  allHistory = async (req: Request, res: Response): Promise<void> => {
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid pagination query'] });
    try {
      return ApiResponse.ok(res, await this.service.listHistory(parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  ownActivity = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = activityQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid borrowing activity query'] });
    try {
      return ApiResponse.ok(res, await this.service.listBorrowingActivity(parsed.data, req.auth.sub));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  allActivity = async (req: Request, res: Response): Promise<void> => {
    const parsed = activityQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid borrowing activity query'] });
    try {
      return ApiResponse.ok(res, await this.service.listBorrowingActivity(parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  returnDamaged = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(damagedReturnSchema, req.body ?? {});
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);

    return this.runAction(req, res, async (actorId, historyId) => ({
      historyId,
      returned: true,
      returnCondition: 'DAMAGED',
      issueId: await this.service.returnDamaged(historyId, actorId, parsed.data.description, parsed.data.mediaIds),
    }));
  };

  detail = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const historyId = readPositiveId(req.params.historyId);
    if (!historyId) return ApiResponse.badRequest(res, { historyId: ['A positive id is required'] });

    try {
      const canViewAll = req.auth.permissionCodes.includes('borrow_history.view_all');
      const history = await this.service.getHistoryDetail(historyId, req.auth.sub, canViewAll);
      if (!history) return ApiResponse.notFound(res, 'Borrow history not found');
      return ApiResponse.ok(res, history);
    } catch {
      return ApiResponse.internalError(res);
    }
  };
}
