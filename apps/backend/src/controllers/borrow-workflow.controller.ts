import { z } from 'zod';
import type { Request, Response } from 'express';
import type { BorrowWorkflowService } from '@/services/borrow-workflow.service.js';
import { BorrowError, ConflictError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const rejectDetailSchema = z.strictObject({
  rejectionReason: z.string().trim().min(1).max(2000),
});

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const reviewQueueQuerySchema = pageQuerySchema.extend({
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

const historyQuerySchema = pageQuerySchema.extend({
  state: z.enum(['ALL', 'CURRENT', 'RETURNED']).default('ALL'),
});

const normalReturnSchema = z.strictObject({});

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
    return this.runAction(req, res, async (actorId, detailId) => ({
      historyId: await this.service.handover(detailId, actorId),
    }));
  };

  returnNormal = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(normalReturnSchema, req.body ?? {});
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);

    return this.runAction(req, res, async (actorId, historyId) => {
      await this.service.returnNormal(historyId, actorId);
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
}
