import type { Request, Response } from 'express';
import { z } from 'zod';
import type {
  ApproveRegistrationInputDto,
  RejectRegistrationInputDto,
  SubmitRegistrationInputDto,
} from '@/models/registration.model.js';
import type { RegistrationService } from '@/services/registration.service.js';
import { RegistrationError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const submitSchema: z.ZodType<SubmitRegistrationInputDto> = z.strictObject({
  name: z.string().trim().min(1).max(30),
  email: z.email().max(40),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must contain exactly 10 digits'),
  password: z.string().min(6).max(72),
});

const approveSchema: z.ZodType<ApproveRegistrationInputDto> = z.strictObject({
  departmentId: z.number().int().positive(),
  roleIds: z.array(z.number().int().positive()).min(1).max(10).refine(
    (ids) => new Set(ids).size === ids.length,
    { message: 'Role IDs must be unique' },
  ).optional(),
});

const rejectSchema: z.ZodType<RejectRegistrationInputDto> = z.strictObject({
  rejectionReason: z.string().trim().max(1000).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function parsePositiveId(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleRegistrationError(error: unknown, res: Response): void {
  if (!(error instanceof RegistrationError)) return ApiResponse.internalError(res);
  if (error.code === 'REQUEST_NOT_FOUND') return ApiResponse.notFound(res, 'Registration request not found');
  if (error.code === 'INVALID_DEPARTMENT') {
    return ApiResponse.badRequest(res, { departmentId: ['Department does not exist'] });
  }
  if (error.code === 'INVALID_ROLE_SET') {
    return ApiResponse.badRequest(res, { roleIds: ['Every selected role must exist'] });
  }
  if (error.code === 'EMAIL_IN_USE') return ApiResponse.conflict(res, 'Email already belongs to a user');
  if (error.code === 'PHONE_IN_USE') return ApiResponse.conflict(res, 'Phone number already belongs to a user');
  if (error.code === 'PENDING_EMAIL_EXISTS') return ApiResponse.conflict(res, 'A pending request already uses this email');
  if (error.code === 'PENDING_PHONE_EXISTS') return ApiResponse.conflict(res, 'A pending request already uses this phone number');
  if (error.code === 'REQUEST_ALREADY_REVIEWED') return ApiResponse.conflict(res, 'Registration request has already been reviewed');
  return ApiResponse.internalError(res);
}

export default class RegistrationController {
  constructor(private readonly service: RegistrationService) {}

  submit = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(submitSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      const request = await this.service.submit(parsed.data);
      return ApiResponse.created(res, { id: request.id, status: request.status, createdAt: request.createdAt });
    } catch (error) {
      return handleRegistrationError(error, res);
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return ApiResponse.badRequest(res, { query: ['Invalid registration request filters'] });
    try {
      return ApiResponse.ok(res, await this.service.list(parsed.data));
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) return ApiResponse.badRequest(res, { requestId: ['Request ID must be a positive integer'] });
    try {
      const request = await this.service.getById(requestId);
      if (!request) return ApiResponse.notFound(res, 'Registration request not found');
      return ApiResponse.ok(res, request);
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) return ApiResponse.badRequest(res, { requestId: ['Request ID must be a positive integer'] });
    const parsed = parseRequestBody(approveSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      return ApiResponse.ok(res, await this.service.approve(requestId, req.auth!.sub, parsed.data));
    } catch (error) {
      return handleRegistrationError(error, res);
    }
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) return ApiResponse.badRequest(res, { requestId: ['Request ID must be a positive integer'] });
    const parsed = parseRequestBody(rejectSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      return ApiResponse.ok(res, await this.service.reject(requestId, req.auth!.sub, parsed.data));
    } catch (error) {
      return handleRegistrationError(error, res);
    }
  };
}
