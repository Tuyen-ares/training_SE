import { z } from 'zod';
import type { Request, Response } from 'express';
import type { CreateVendorDto, UpdateVendorDto } from '@/models/vendor.model.js';
import type { VendorService } from '@/services/vendor.service.js';
import { ConflictError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max).nullable().optional(),
);

const createSchema: z.ZodType<CreateVendorDto> = z.strictObject({
  name: z.string().trim().min(1).max(255),
  contactName: optionalText(255),
  phone: optionalText(50),
  email: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? null : value,
    z.email().trim().max(255).nullable().optional(),
  ),
  address: optionalText(1000),
});

const updateSchema: z.ZodType<UpdateVendorDto> = z.strictObject({
  name: z.string().trim().min(1).max(255).optional(),
  contactName: optionalText(255),
  phone: optionalText(50),
  email: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? null : value,
    z.email().trim().max(255).nullable().optional(),
  ),
  address: optionalText(1000),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one vendor field is required',
});

const querySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});

function positiveId(value: string | string[] | undefined): number | null {
  const id = Number(typeof value === 'string' ? value : '');
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleError(error: unknown, res: Response): void {
  if (error instanceof ConflictError) return ApiResponse.conflict(res, error.message);
  return ApiResponse.internalError(res);
}

export class VendorController {
  constructor(private readonly service: VendorService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid vendor query'] });
    try {
      return ApiResponse.ok(res, await this.service.list(parsed.data));
    } catch (error) {
      return handleError(error, res);
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = positiveId(req.params.id);
    if (!id) return ApiResponse.badRequest(res, { id: ['A positive vendor id is required'] });
    try {
      const vendor = await this.service.getById(id);
      if (!vendor) return ApiResponse.notFound(res, 'Vendor not found');
      return ApiResponse.ok(res, vendor);
    } catch (error) {
      return handleError(error, res);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(createSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      return ApiResponse.created(res, await this.service.create(parsed.data));
    } catch (error) {
      return handleError(error, res);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = positiveId(req.params.id);
    if (!id) return ApiResponse.badRequest(res, { id: ['A positive vendor id is required'] });
    const parsed = parseRequestBody(updateSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      const vendor = await this.service.update(id, parsed.data);
      if (!vendor) return ApiResponse.notFound(res, 'Vendor not found');
      return ApiResponse.ok(res, vendor);
    } catch (error) {
      return handleError(error, res);
    }
  };
}
