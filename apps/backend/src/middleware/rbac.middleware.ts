import type { RequestHandler } from 'express';
import { ApiResponse } from '@/shared/api-response.js';

export function requirePermission(requiredCode: string): RequestHandler {
  return (req, res, next): void => {
    if (!req.auth) {
      ApiResponse.unauthorized(res);
      return;
    }

    if (!req.auth.permissionCodes.includes(requiredCode)) {
      ApiResponse.forbidden(res, 'Missing required permission');
      return;
    }

    next();
  };
}

export function requireAnyPermission(...requiredCodes: string[]): RequestHandler {
  return (req, res, next): void => {
    if (!req.auth) {
      ApiResponse.unauthorized(res);
      return;
    }

    if (!requiredCodes.some((code) => req.auth?.permissionCodes.includes(code))) {
      ApiResponse.forbidden(res, 'Missing required permission');
      return;
    }

    next();
  };
}

export function requireRoleAssignWhenRoleIdsProvided(): RequestHandler {
  return (req, res, next): void => {
    const roleIds = (req.body as { roleIds?: unknown } | undefined)?.roleIds;
    const explicitlySelectedRoles = Array.isArray(roleIds) && roleIds.length > 0;

    if (!explicitlySelectedRoles) {
      next();
      return;
    }

    requirePermission('role.assign')(req, res, next);
  };
}
