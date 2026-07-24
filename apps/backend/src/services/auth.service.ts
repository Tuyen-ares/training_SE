import type {
  AuthenticatedUserDto,
  LoginInputDto,
  LoginResult,
  RefreshResult,
  RegisterInputDto,
} from '@/models/auth.model.js';
import type { AuthUserRecord, IAuthRepository } from '@/repositories/auth.repository.js';
import type { IRefreshTokenRepository } from '@/repositories/refresh-token.repository.js';
import type { SessionService } from '@/services/session.service.js';
import { TokenService } from '@/services/token.service.js';
import type { UserService } from '@/services/user.service.js';
import { AuthError, UserError } from '@/shared/app-error.js';
import { verifyPassword } from '@/shared/security/password-hasher.js';

function toAuthenticatedUserDto(user: AuthUserRecord): AuthenticatedUserDto {
  return {
    id: user.id,
    name: user.name,
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
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  async register(input: RegisterInputDto): Promise<void> {
    try {
      await this.userService.create({
        departmentId: input.departmentId,
        name: input.name,
        password: input.password,
        email: input.email,
        phone: input.phone,
      });
    } catch (error) {
      if (error instanceof UserError) {
        if (error.code === 'EMAIL_IN_USE') throw new AuthError('EMAIL_IN_USE');
        if (error.code === 'PHONE_IN_USE') throw new AuthError('PHONE_IN_USE');
        if (error.code === 'INVALID_DEPARTMENT') {
          throw new AuthError('INVALID_DEPARTMENT');
        }
      }
      throw error;
    }
  }

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

    const storedToken = await this.refreshTokenRepository.findByJti(payload.jti);
    if (
      !storedToken ||
      storedToken.userId !== payload.sub ||
      storedToken.familyId !== payload.familyId
    ) {
      throw new AuthError('INVALID_REFRESH_TOKEN');
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user) throw new AuthError('INVALID_REFRESH_TOKEN');
    if (!user.isActive) {
      await this.sessionService.revokeAllForUser(user.id);
      throw new AuthError('INVALID_REFRESH_TOKEN');
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
    );

    if (rotationResult === 'REUSED') {
      throw new AuthError('REFRESH_TOKEN_REUSED');
    }
    if (rotationResult !== 'ROTATED') {
      throw new AuthError('INVALID_REFRESH_TOKEN');
    }

    return {
      accessToken: this.tokenService.createAccessToken(user.id, user.permissionCodes),
      refreshToken: nextRefreshToken.token,
      refreshTokenExpiresAt: nextRefreshToken.expiresAt,
      user: toAuthenticatedUserDto(user),
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) return;

    await this.refreshTokenRepository.revokeFamily(payload.familyId);
  }
}
