import type { IRefreshTokenRepository } from '@/repositories/refresh-token.repository.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export class SessionService {
  constructor(private readonly refreshTokenRepository: IRefreshTokenRepository) {}

  revokeAllForUser(
    userId: number,
    transaction?: PrismaTransaction,
  ): Promise<void> {
    return this.refreshTokenRepository.revokeAllByUserId(userId, transaction);
  }
}
