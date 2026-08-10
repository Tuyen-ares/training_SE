import { z } from 'zod';
import type { Request, Response } from 'express';
import type { BorrowRequestStatus, CreateBorrowRequestDto } from '@/models/borrow-lifecycle.model.js';
import { BorrowError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';
import type { BorrowRequestService } from '@/services/borrow-request.service.js';

const requestStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PARTIALLY_APPROVED',
  'COMPLETED',
  'CANCELLED',
]);

const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const dateOnlyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function parseBusinessDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime()) || dateOnlyFormatter.format(parsed) !== value) return null;
  if (value < dateOnlyFormatter.format(new Date())) return null;
  return parsed;
}

const createBorrowRequestSchema = z.strictObject({
    note: z.string().trim().min(1, 'Borrowing purpose is required').max(2000),
    items: z.array(z.strictObject({
      assetId: z.number().int().positive(),
      expectedReturnDate: z.string().refine(
        (value) => parseBusinessDate(value) !== null,
        'Expected return date must be YYYY-MM-DD and today or later in Asia/Ho_Chi_Minh',
      ),
    })).min(1),
  });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: requestStatusSchema.optional(),
});

function readPositiveId(value: string | string[] | undefined): number | null {
  const id = Number(typeof value === 'string' ? value : '');
  return Number.isInteger(id) && id > 0 ? id : null;
}

export class BorrowRequestController {
  constructor(private readonly service: BorrowRequestService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = parseRequestBody(createBorrowRequestSchema, req.body);
    if (parsed.success === false) {
      return ApiResponse.badRequest(res, parsed.errors);
    }
    try {
      const dto: CreateBorrowRequestDto = {
        ...parsed.data,
        items: parsed.data.items.map((item) => ({
          ...item,
          expectedReturnDate: parseBusinessDate(item.expectedReturnDate) as Date,
        })),
      };
      const request = await this.service.create(req.auth.sub, dto);
      return ApiResponse.created(res, request);
    } catch (error) {
      if (error instanceof BorrowError) {
        return ApiResponse.conflict(res, 'One or more selected assets are unavailable');
      }
      return ApiResponse.internalError(res);
    }
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return ApiResponse.badRequest(res, { query: ['Invalid borrow request query'] });
    }
    try {
      return ApiResponse.ok(res, await this.service.listMine(req.auth.sub, {
        ...parsed.data,
        status: parsed.data.status as BorrowRequestStatus | undefined,
      }));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  getMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) return ApiResponse.unauthorized(res);
    const requestId = readPositiveId(req.params.requestId);
    if (!requestId) {
      return ApiResponse.badRequest(res, {
        requestId: ['Request id must be a positive integer'],
      });
    }
    try {
      const request = await this.service.getMine(requestId, req.auth.sub);
      if (!request) return ApiResponse.notFound(res, 'Borrow request not found');
      return ApiResponse.ok(res, request);
    } catch {
      return ApiResponse.internalError(res);
    }
  };
}
