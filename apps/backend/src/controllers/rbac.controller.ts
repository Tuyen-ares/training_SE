import type { Request, Response } from 'express';
import { z } from 'zod';
import type {
  CreateRoleInputDto,
  ReplaceRolePermissionsInputDto,
  ReplaceUserRolesInputDto,
  UpdateRoleInputDto,
} from '@/models/rbac.model.js';
import type { RbacService } from '@/services/rbac.service.js';
import { RbacError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const idSetSchema = z.array(z.number().int().positive()).min(1).max(100).refine(
  (ids) => new Set(ids).size === ids.length,
  { message: 'IDs must be unique' },
);

const replaceRolesSchema: z.ZodType<ReplaceUserRolesInputDto> = z.strictObject({
  roleIds: idSetSchema.max(10),
});

const createRoleSchema: z.ZodType<CreateRoleInputDto> = z.strictObject({
  name: z.string().trim().min(1).max(30),
  permissionIds: idSetSchema,
});

const updateRoleSchema: z.ZodType<UpdateRoleInputDto> = z.strictObject({
  name: z.string().trim().min(1).max(30),
});

const replacePermissionsSchema: z.ZodType<ReplaceRolePermissionsInputDto> = z.strictObject({
  permissionIds: idSetSchema,
});

function parsePositiveId(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleRbacError(error: unknown, res: Response): void {
  if (!(error instanceof RbacError)) return ApiResponse.internalError(res);
  if (error.code === 'USER_NOT_FOUND') return ApiResponse.notFound(res, 'User not found');
  if (error.code === 'ROLE_NOT_FOUND') return ApiResponse.notFound(res, 'Role not found');
  if (error.code === 'INVALID_ROLE_SET') {
    return ApiResponse.badRequest(res, { roleIds: ['Select at least one existing role'] });
  }
  if (error.code === 'INVALID_PERMISSION_SET') {
    return ApiResponse.badRequest(res, { permissionIds: ['Select at least one existing permission'] });
  }
  if (error.code === 'ROLE_NAME_IN_USE') return ApiResponse.conflict(res, 'Role name already exists');
  if (error.code === 'SYSTEM_ROLE_RENAME_FORBIDDEN') {
    return ApiResponse.conflict(res, 'System roles cannot be renamed');
  }
  if (error.code === 'ESSENTIAL_ADMIN_REQUIRED') {
    return ApiResponse.conflict(res, 'At least one active user must retain all essential administration permissions');
  }
  return ApiResponse.internalError(res);
}

export default class RbacController {
  constructor(private readonly service: RbacService) {}

  listRoles = async (_req: Request, res: Response): Promise<void> => {
    try {
      return ApiResponse.ok(res, await this.service.listRoles());
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  getRole = async (req: Request, res: Response): Promise<void> => {
    const roleId = parsePositiveId(req.params.roleId);
    if (!roleId) return ApiResponse.badRequest(res, { roleId: ['Role ID must be a positive integer'] });
    try {
      const role = await this.service.getRole(roleId);
      if (!role) return ApiResponse.notFound(res, 'Role not found');
      return ApiResponse.ok(res, role);
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  listPermissions = async (_req: Request, res: Response): Promise<void> => {
    try {
      return ApiResponse.ok(res, await this.service.listPermissions());
    } catch {
      return ApiResponse.internalError(res);
    }
  };

  createRole = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(createRoleSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      return ApiResponse.created(res, await this.service.createRole(parsed.data));
    } catch (error) {
      return handleRbacError(error, res);
    }
  };

  updateRole = async (req: Request, res: Response): Promise<void> => {
    const roleId = parsePositiveId(req.params.roleId);
    if (!roleId) return ApiResponse.badRequest(res, { roleId: ['Role ID must be a positive integer'] });
    const parsed = parseRequestBody(updateRoleSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      return ApiResponse.ok(res, await this.service.updateRoleName(roleId, parsed.data.name));
    } catch (error) {
      return handleRbacError(error, res);
    }
  };

  replaceRolePermissions = async (req: Request, res: Response): Promise<void> => {
    const roleId = parsePositiveId(req.params.roleId);
    if (!roleId) return ApiResponse.badRequest(res, { roleId: ['Role ID must be a positive integer'] });
    const parsed = parseRequestBody(replacePermissionsSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      return ApiResponse.ok(res, await this.service.replaceRolePermissions(roleId, parsed.data.permissionIds));
    } catch (error) {
      return handleRbacError(error, res);
    }
  };

  replaceUserRoles = async (req: Request, res: Response): Promise<void> => {
    const userId = parsePositiveId(req.params.userId);
    if (!userId) return ApiResponse.badRequest(res, { userId: ['User ID must be a positive integer'] });
    const parsed = parseRequestBody(replaceRolesSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      await this.service.replaceUserRoles(userId, parsed.data.roleIds);
      return ApiResponse.ok(res, { message: 'User roles updated successfully' });
    } catch (error) {
      return handleRbacError(error, res);
    }
  };
}
