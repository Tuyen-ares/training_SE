import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ReplaceUserRolesInputDto } from '@/models/rbac.model.js';
import type { RbacService } from '@/services/rbac.service.js';
import { RbacError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const replaceRolesSchema: z.ZodType<ReplaceUserRolesInputDto> = z.strictObject({
  roleIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(10)
    .refine((roleIds) => new Set(roleIds).size === roleIds.length, {
      message: 'Role IDs must be unique',
    }),
});

function parsePositiveId(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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

  replaceUserRoles = async (req: Request, res: Response): Promise<void> => {
    const userId = parsePositiveId(req.params.userId);
    if (!userId) {
      return ApiResponse.badRequest(res, {
        userId: ['User ID must be a positive integer'],
      });
    }

    const parsed = parseRequestBody(replaceRolesSchema, req.body);
    if (parsed.success === false) {
      return ApiResponse.badRequest(res, parsed.errors);
    }

    try {
      await this.service.replaceUserRoles(userId, parsed.data.roleIds);
      return ApiResponse.ok(res, { message: 'User roles updated successfully' });
    } catch (error) {
      if (error instanceof RbacError) {
        if (error.code === 'USER_NOT_FOUND') {
          return ApiResponse.notFound(res, 'User not found');
        }
        if (error.code === 'INVALID_ROLE_SET') {
          return ApiResponse.badRequest(res, {
            roleIds: ['Every selected role must exist'],
          });
        }
      }
      return ApiResponse.internalError(res);
    }
  };
}
