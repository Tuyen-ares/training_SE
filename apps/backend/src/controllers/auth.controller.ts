import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import type { LoginInputDto } from '@/models/auth.model.js';
import type { AuthService } from '@/services/auth.service.js';
import { AuthError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const loginSchema: z.ZodType<LoginInputDto> = z.strictObject({
  email: z.email().max(40),
  password: z.string().min(1).max(72),
});

const REFRESH_TOKEN_COOKIE = 'refreshToken';

function getRefreshTokenCookieOptions(expires?: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Render/Vercel are cross-site in production; use None with Secure there.
    // Revisit this policy when token-based CSRF protection is implemented.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
    ...(expires ? { expires } : {}),
  };
}

function getRefreshTokenFromCookie(req: Request): string | undefined {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshTokenCookieOptions());
}

export default class AuthController {
  constructor(private readonly service: AuthService) {}

  handleLogin = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseRequestBody(loginSchema, req.body);
    if (parsed.success === false) {
      return ApiResponse.badRequest(res, parsed.errors);
    }

    try {
      const result = await this.service.login(parsed.data);
      res.cookie(
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
        getRefreshTokenCookieOptions(result.refreshTokenExpiresAt),
      );
      return ApiResponse.ok(res, {
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      if (error instanceof AuthError && error.code === 'INVALID_CREDENTIALS') {
        return ApiResponse.unauthorized(res, 'Invalid email or password');
      }
      return ApiResponse.internalError(res);
    }
  };

  handleRefresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = getRefreshTokenFromCookie(req);
    if (!refreshToken) {
      return ApiResponse.unauthorized(res, 'Missing refresh token');
    }

    try {
      const result = await this.service.refresh(refreshToken);
      res.cookie(
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
        getRefreshTokenCookieOptions(result.refreshTokenExpiresAt),
      );
      return ApiResponse.ok(res, {
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      if (
        error instanceof AuthError &&
        (error.code === 'INVALID_REFRESH_TOKEN' || error.code === 'REFRESH_TOKEN_REUSED')
      ) {
        clearRefreshTokenCookie(res);
        return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
      }
      return ApiResponse.internalError(res);
    }
  };

  handleLogout = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.service.logout(getRefreshTokenFromCookie(req));
      clearRefreshTokenCookie(res);
      return ApiResponse.noContent(res);
    } catch {
      clearRefreshTokenCookie(res);
      return ApiResponse.internalError(res);
    }
  };
}
