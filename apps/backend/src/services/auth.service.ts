import type {
  AuthenticatedUserDto,
  LoginInputDto,
  LoginResult,
  RefreshResult,
} from '@/models/auth.model.js';
import type { AuthUserRecord, IAuthRepository } from '@/repositories/auth.repository.js';
import type { IRefreshTokenRepository } from '@/repositories/refresh-token.repository.js';
import type { SessionService } from '@/services/session.service.js';
import type { PrismaClient } from '../../generated/prisma/index.js';
import { TokenService } from '@/services/token.service.js';
import { AuthError } from '@/shared/app-error.js';
import { verifyPassword } from '@/shared/security/password-hasher.js';

function toAuthenticatedUserDto(user: AuthUserRecord): AuthenticatedUserDto {
  return {
    id: user.id,
    userCode: user.userCode,
    name: user.name,
    avatarUrl: user.avatarUrl,
    avatarMediaId: user.avatarMediaId,
    email: user.email,
    phone: user.phone,
    departmentId: user.departmentId,
    roles: user.roles,
    permissionCodes: user.permissionCodes,
  };
}

export class AuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaClient,
  ) {}

  async login(input: LoginInputDto): Promise<LoginResult> {
    const user = await this.authRepository.findUserByEmail(input.email);
    if (!user || !user.isActive) {
      throw new AuthError('INVALID_CREDENTIALS');
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);
    if (!passwordMatches) throw new AuthError('INVALID_CREDENTIALS');

    const authenticatedUser = toAuthenticatedUserDto(user);
    const accessToken = this.tokenService.createAccessToken(user.id, user.permissionCodes);
    const issuedRefreshToken = this.tokenService.createRefreshToken(user.id);

    await this.refreshTokenRepository.create({
      jti: issuedRefreshToken.jti,
      userId: user.id,
      familyId: issuedRefreshToken.familyId,
      expiresAt: issuedRefreshToken.expiresAt,
    });

    return {
      accessToken,
      refreshToken: issuedRefreshToken.token,
      refreshTokenExpiresAt: issuedRefreshToken.expiresAt,
      user: authenticatedUser,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) throw new AuthError('INVALID_REFRESH_TOKEN');

    const result = await this.prisma.$transaction(async (transaction) => {
      const storedToken = await this.refreshTokenRepository.findByJti(payload.jti, transaction);
      if (
        !storedToken ||
        storedToken.userId !== payload.sub ||
        storedToken.familyId !== payload.familyId
      ) {
        return { status: 'INVALID' as const };
      }

      const user = await this.authRepository.findUserById(payload.sub, transaction);
      if (!user) return { status: 'INVALID' as const };
      if (!user.isActive) {
        await this.sessionService.revokeAllForUser(user.id, transaction);
        return { status: 'INACTIVE' as const };
      }

      const nextRefreshToken = this.tokenService.createRefreshToken(
        user.id,
        payload.familyId,
        storedToken.expiresAt,
      );

      const rotationResult = await this.refreshTokenRepository.rotate(
        {
          jti: payload.jti,
          userId: payload.sub,
          familyId: payload.familyId,
        },
        {
          jti: nextRefreshToken.jti,
          userId: user.id,
          familyId: nextRefreshToken.familyId,
          expiresAt: nextRefreshToken.expiresAt,
        },
        transaction,
      );

      return { status: rotationResult, user, nextRefreshToken };
    });

    if (result.status === 'INACTIVE' || result.status === 'INVALID') {
      throw new AuthError('INVALID_REFRESH_TOKEN');
    }
    if (result.status === 'REUSED') {
      throw new AuthError('REFRESH_TOKEN_REUSED');
    }
    if (result.status !== 'ROTATED') {
      throw new AuthError('INVALID_REFRESH_TOKEN');
    }

    return {
      accessToken: this.tokenService.createAccessToken(result.user.id, result.user.permissionCodes),
      refreshToken: result.nextRefreshToken.token,
      refreshTokenExpiresAt: result.nextRefreshToken.expiresAt,
      user: toAuthenticatedUserDto(result.user),
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) return;

    await this.refreshTokenRepository.revokeFamily(payload.familyId);
  }
}
