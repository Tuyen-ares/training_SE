import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  RefreshTokenIdentity,
  RefreshTokenRotationResult,
} from '@/repositories/refresh-token.repository.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateRefreshTokenData): Promise<void> {
    await this.prisma.refresh_tokens.create({
      data: {
        jti: data.jti,
        user_id: data.userId,
        family_id: data.familyId,
        expires_at: data.expiresAt,
      },
    });
  }

  async findByJti(jti: string): Promise<CreateRefreshTokenData | null> {
    const token = await this.prisma.refresh_tokens.findUnique({
      where: { jti },
      select: {
        jti: true,
        user_id: true,
        family_id: true,
        expires_at: true,
      },
    });

    if (!token) return null;

    return {
      jti: token.jti,
      userId: token.user_id,
      familyId: token.family_id,
      expiresAt: token.expires_at,
    };
  }

  async rotate(
    current: RefreshTokenIdentity,
    replacement: CreateRefreshTokenData,
  ): Promise<RefreshTokenRotationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const storedToken = await transaction.refresh_tokens.findUnique({
        where: { jti: current.jti },
      });

      if (!storedToken) return 'INVALID';

      const tokenBelongsToSession =
        storedToken.user_id === current.userId &&
        storedToken.family_id === current.familyId;
      if (!tokenBelongsToSession) return 'INVALID';

      if (storedToken.is_used) {
        await transaction.refresh_tokens.updateMany({
          where: { family_id: storedToken.family_id },
          data: { is_revoked: true },
        });
        return 'REUSED';
      }

      const now = new Date();
      if (storedToken.is_revoked || storedToken.expires_at <= now) {
        return 'INVALID';
      }

      const consumed = await transaction.refresh_tokens.updateMany({
        where: {
          id: storedToken.id,
          is_used: false,
          is_revoked: false,
          expires_at: { gt: now },
        },
        data: { is_used: true },
      });

      // A second request can reach this point concurrently. Treat it as reuse.
      if (consumed.count !== 1) {
        await transaction.refresh_tokens.updateMany({
          where: { family_id: storedToken.family_id },
          data: { is_revoked: true },
        });
        return 'REUSED';
      }

      await transaction.refresh_tokens.create({
        data: {
          jti: replacement.jti,
          user_id: replacement.userId,
          family_id: replacement.familyId,
          expires_at: replacement.expiresAt,
        },
      });

      return 'ROTATED';
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refresh_tokens.updateMany({
      where: { family_id: familyId },
      data: { is_revoked: true },
    });
  }

  async revokeAllByUserId(
    userId: number,
    transaction?: PrismaTransaction,
  ): Promise<void> {
    const database = transaction ?? this.prisma;
    await database.refresh_tokens.updateMany({
      where: { user_id: userId },
      data: { is_revoked: true },
    });
  }
}
