import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export interface RefreshTokenIdentity {
  jti: string;
  userId: number;
  familyId: string;
}

export interface CreateRefreshTokenData extends RefreshTokenIdentity {
  expiresAt: Date;
}

export type RefreshTokenRotationResult = 'ROTATED' | 'INVALID' | 'REUSED';

export type RefreshTokenTransaction = Pick<PrismaTransaction, 'refresh_tokens'>;

export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<void>;
  findByJti(jti: string, transaction?: RefreshTokenTransaction): Promise<CreateRefreshTokenData | null>;
  rotate(
    current: RefreshTokenIdentity,
    replacement: CreateRefreshTokenData,
    transaction: RefreshTokenTransaction,
  ): Promise<RefreshTokenRotationResult>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllByUserId(
    userId: number,
    transaction: RefreshTokenTransaction,
  ): Promise<void>;
}
