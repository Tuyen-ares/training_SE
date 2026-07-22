import bcrypt from 'bcrypt';
import type {
  AuthenticatedUserDto,
  LoginInputDto,
  LoginResult,
  RegisterInputDto,
  TokenPair,
} from '@/models/auth.model.js';
import type { AuthUserRecord, IAuthRepository } from '@/repositories/auth.repository.js';
import type { IRefreshTokenRepository } from '@/repositories/refresh-token.repository.js';
import { TokenService } from '@/services/token.service.js';
import { AuthError } from '@/shared/app-error.js';

const SALT_ROUNDS = 10;
const DEFAULT_REGISTER_ROLE_NAME = 'staff';

function getDefaultRegisterRoleName(): string {
  return process.env.DEFAULT_REGISTER_ROLE_NAME?.trim() || DEFAULT_REGISTER_ROLE_NAME;
}

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
  ) {}

  async register(input: RegisterInputDto): Promise<void> {
    const [emailExists, phoneExists, departmentExists, defaultRoleId] = await Promise.all([
      this.authRepository.emailExists(input.email),
      this.authRepository.phoneExists(input.phone),
      this.authRepository.departmentExists(input.departmentId),
      this.authRepository.findRoleIdByName(getDefaultRegisterRoleName()),
    ]);

    if (emailExists) throw new AuthError('EMAIL_IN_USE');
    if (phoneExists) throw new AuthError('PHONE_IN_USE');
    if (!departmentExists) throw new AuthError('INVALID_DEPARTMENT');
    if (defaultRoleId === null) {
      throw new Error(`Default register role "${getDefaultRegisterRoleName()}" does not exist`);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    await this.authRepository.createUserWithRole({
      departmentId: input.departmentId,
      roleId: defaultRoleId,
      name: input.name,
      passwordHash,
      email: input.email,
      phone: input.phone,
    });
  }

  async login(input: LoginInputDto): Promise<LoginResult> {
    const user = await this.authRepository.findUserByEmail(input.email);
    if (!user) throw new AuthError('INVALID_CREDENTIALS');

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
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

  async refresh(refreshToken: string): Promise<TokenPair> {
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

    // Reload the user so the new access token receives current permissions.
    const user = await this.authRepository.findUserById(payload.sub);
    if (!user) throw new AuthError('INVALID_REFRESH_TOKEN');

    // Keep the original session expiration instead of extending it forever.
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
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) return;

    await this.refreshTokenRepository.revokeFamily(payload.familyId);
  }
}
