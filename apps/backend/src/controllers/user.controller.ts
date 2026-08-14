import type { Request, Response } from 'express';
import { z } from 'zod';
import type {
  CreateUserInputDto,
  UpdateUserInputDto,
  UserStatusFilter,
} from '@/models/user.model.js';
import type { UserService } from '@/services/user.service.js';
import { RbacError, UserError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const roleIdsSchema = z
  .array(z.number().int().positive())
  .max(10)
  .refine((roleIds) => new Set(roleIds).size === roleIds.length, {
    message: 'Role IDs must be unique',
  });

const avatarUrlSchema = z
  .url()
  .max(500)
  .nullable();

const createUserSchema: z.ZodType<CreateUserInputDto> = z.strictObject({
  departmentId: z.number().int().positive(),
  name: z.string().trim().min(1).max(30),
  avatarUrl: avatarUrlSchema.optional(),
  email: z.email().max(40),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must contain exactly 10 digits'),
  password: z.string().min(6).max(72),
  roleIds: roleIdsSchema.optional(),
});

const updateUserSchema: z.ZodType<UpdateUserInputDto> = z
  .strictObject({
    departmentId: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(30).optional(),
    avatarUrl: avatarUrlSchema.optional(),
    email: z.email().max(40).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\d{10}$/, 'Phone must contain exactly 10 digits')
      .optional(),
    password: z.string().min(6).max(72).optional(),
    roleIds: roleIdsSchema.min(1).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field is required',
  });

const statusSchema = z.enum(['active', 'inactive', 'all']);

const updateStatusSchema = z.strictObject({
  isActive: z.boolean(),
});

function parsePositiveId(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleUserError(error: unknown, res: Response): void {
  if (error instanceof RbacError && error.code === 'ESSENTIAL_ADMIN_REQUIRED') {
    return ApiResponse.conflict(res, 'At least one active user must retain all essential administration permissions');
  }
  if (!(error instanceof UserError)) {
    return ApiResponse.internalError(res);
  }

  if (error.code === 'EMAIL_IN_USE') {
    return ApiResponse.conflict(res, 'Email already in use');
  }
  if (error.code === 'PHONE_IN_USE') {
    return ApiResponse.conflict(res, 'Phone number already in use');
  }
  if (error.code === 'INVALID_DEPARTMENT') {
    return ApiResponse.badRequest(res, {
      departmentId: ['Department does not exist'],
    });
  }
  if (error.code === 'INVALID_ROLE_SET') {
    return ApiResponse.badRequest(res, {
      roleIds: ['Every selected role must exist'],
    });
  }
  if (error.code === 'USER_NOT_FOUND') {
    return ApiResponse.notFound(res, 'User not found');
  }

  return ApiResponse.internalError(res);
}

export default class UserController {
  constructor(private readonly service: UserService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const parsedStatus = statusSchema.safeParse(req.query.status ?? 'active');
    if (!parsedStatus.success) {
      return ApiResponse.badRequest(res, {
        status: ['Status must be active, inactive or all'],
      });
    }

    try {
      const users = await this.service.getAll(
        parsedStatus.data as UserStatusFilter,
      );
      return ApiResponse.ok(res, users);
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return ApiResponse.badRequest(res, { id: ['User ID must be a positive integer'] });
    }

    try {
      const user = await this.service.getById(id);
      if (!user) return ApiResponse.notFound(res, 'User not found');
      return ApiResponse.ok(res, user);
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(createUserSchema, req.body);
    if (parsed.success === false) {
      return ApiResponse.badRequest(res, parsed.errors);
    }

    try {
      const user = await this.service.create(parsed.data);
      return ApiResponse.created(res, user);
    } catch (error) {
      return handleUserError(error, res);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return ApiResponse.badRequest(res, { id: ['User ID must be a positive integer'] });
    }

    const parsed = parseRequestBody(updateUserSchema, req.body);
    if (parsed.success === false) {
      return ApiResponse.badRequest(res, parsed.errors);
    }

    try {
      const user = await this.service.update(id, parsed.data);
      if (!user) return ApiResponse.notFound(res, 'User not found');
      return ApiResponse.ok(res, user);
    } catch (error) {
      return handleUserError(error, res);
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return ApiResponse.badRequest(res, { id: ['User ID must be a positive integer'] });
    }

    const parsed = parseRequestBody(updateStatusSchema, req.body);
    if (parsed.success === false) {
      return ApiResponse.badRequest(res, parsed.errors);
    }

    try {
      const user = await this.service.setStatus(id, parsed.data.isActive);
      if (!user) return ApiResponse.notFound(res, 'User not found');
      return ApiResponse.ok(res, user);
    } catch (error) {
      return handleUserError(error, res);
    }
  };
}
