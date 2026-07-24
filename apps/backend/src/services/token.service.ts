import { randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '@/models/auth.model.js';

const DEFAULT_REFRESH_TOKEN_EXPIRES_IN: SignOptions['expiresIn'] = '7d';

const refreshTokenPayloadSchema: z.ZodType<RefreshTokenPayload> = z.object({
  sub: z.number().int().positive(),
  jti: z.uuid(),
  familyId: z.uuid(),
});

interface IssuedRefreshToken {
  token: string;
  jti: string;
  familyId: string;
  expiresAt: Date;
}

function getRequiredSecret(name: 'JWT_SECRET' | 'REFRESH_TOKEN_SECRET'): string {
  const secret = process.env[name];
  if (!secret) throw new Error(`${name} is not configured`);
  return secret;
}

function getRequiredAccessTokenExpiresIn(): SignOptions['expiresIn'] {
  const expiresIn = process.env.JWT_EXPIRES_IN?.trim();
  if (!expiresIn) throw new Error('JWT_EXPIRES_IN is not configured');
  return expiresIn as SignOptions['expiresIn'];
}

function getExpiresIn(
  name: 'REFRESH_TOKEN_EXPIRES_IN',
  fallback: SignOptions['expiresIn'],
): SignOptions['expiresIn'] {
  return process.env[name]
    ? process.env[name] as SignOptions['expiresIn']
    : fallback;
}

function readExpiration(token: string): Date {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') {
    throw new Error('Generated refresh token has no expiration');
  }
  return new Date(decoded.exp * 1000);
}

export class TokenService {
  createAccessToken(userId: number, permissionCodes: string[]): string {
    const payload: AccessTokenPayload = {
      sub: userId,
      permissionCodes,
    };

    return jwt.sign(payload, getRequiredSecret('JWT_SECRET'), {
      algorithm: 'HS256',
      expiresIn: getRequiredAccessTokenExpiresIn(),
    });
  }

  createRefreshToken(
    userId: number,
    familyId: string = randomUUID(),
    expiresAt?: Date,
  ): IssuedRefreshToken {
    const jti = randomUUID();
    const payload: RefreshTokenPayload & { exp?: number } = {
      sub: userId,
      jti,
      familyId,
    };

    if (expiresAt) {
      payload.exp = Math.floor(expiresAt.getTime() / 1000);
    }

    const token = jwt.sign(payload, getRequiredSecret('REFRESH_TOKEN_SECRET'), {
      algorithm: 'HS256',
      ...(expiresAt
        ? {}
        : {
            expiresIn: getExpiresIn(
              'REFRESH_TOKEN_EXPIRES_IN',
              DEFAULT_REFRESH_TOKEN_EXPIRES_IN,
            ),
          }),
    });

    return {
      token,
      jti,
      familyId,
      expiresAt: expiresAt ?? readExpiration(token),
    };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    const secret = getRequiredSecret('REFRESH_TOKEN_SECRET');
    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      });
      const parsed = refreshTokenPayloadSchema.safeParse(decoded);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}
