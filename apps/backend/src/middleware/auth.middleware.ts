import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { AccessTokenPayload } from '@/models/auth.model.js';
import { ApiResponse } from '@/shared/api-response.js';

const accessTokenPayloadSchema: z.ZodType<AccessTokenPayload> = z.object({
  sub: z.number().int().positive(),
  permissionCodes: z.array(z.string().min(1).max(30)),
});

export const requireAuth: RequestHandler = (req, res, next): void => {
  const authorization = req.headers.authorization;
  const [scheme, token, ...extraParts] = authorization?.trim().split(/\s+/) ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !token || extraParts.length > 0) {
    ApiResponse.unauthorized(res, 'Missing or malformed access token');
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    ApiResponse.internalError(res);
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    const parsed = accessTokenPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      ApiResponse.unauthorized(res, 'Invalid access token');
      return;
    }

    req.auth = parsed.data;
    next();
  } catch {
    ApiResponse.unauthorized(res, 'Invalid or expired access token');
  }
};

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
