import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthUserRecord, IAuthRepository } from '../src/repositories/auth.repository.js';
import type {
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  RefreshTokenIdentity,
  RefreshTokenRotationResult,
} from '../src/repositories/refresh-token.repository.js';
import { AuthService } from '../src/services/auth.service.js';
import type { SessionService } from '../src/services/session.service.js';
import { TokenService } from '../src/services/token.service.js';
import type { UserService } from '../src/services/user.service.js';
import { AuthError, UserError } from '../src/shared/app-error.js';
import { hashPassword } from '../src/shared/security/password-hasher.js';

process.env.JWT_SECRET = 'test-access-secret-that-is-long-enough';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-that-is-long-enough';

interface StoredToken extends CreateRefreshTokenData {
  isUsed: boolean;
  isRevoked: boolean;
}

class MemoryRefreshTokenRepository implements IRefreshTokenRepository {
  readonly tokens = new Map<string, StoredToken>();

  async create(data: CreateRefreshTokenData): Promise<void> {
    this.tokens.set(data.jti, { ...data, isUsed: false, isRevoked: false });
  }

  async findByJti(jti: string): Promise<CreateRefreshTokenData | null> {
    const token = this.tokens.get(jti);
    if (!token) return null;
    return {
      jti: token.jti,
      userId: token.userId,
      familyId: token.familyId,
      expiresAt: token.expiresAt,
    };
  }

  async rotate(
    current: RefreshTokenIdentity,
    replacement: CreateRefreshTokenData,
  ): Promise<RefreshTokenRotationResult> {
    const token = this.tokens.get(current.jti);
    if (!token) return 'INVALID';

    if (token.isUsed) {
      await this.revokeFamily(token.familyId);
      return 'REUSED';
    }
    if (token.isRevoked || token.expiresAt <= new Date()) return 'INVALID';

    token.isUsed = true;
    this.tokens.set(replacement.jti, {
      ...replacement,
      isUsed: false,
      isRevoked: false,
    });
    return 'ROTATED';
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.familyId === familyId) token.isRevoked = true;
    }
  }

  async revokeAllByUserId(userId: number): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.userId === userId) token.isRevoked = true;
    }
  }
}

async function createAuthHarness(
  isActive = true,
  userServiceOverride?: UserService,
) {
  const user: AuthUserRecord = {
    id: 1,
    userCode: 'BI26001',
    departmentId: 1,
    name: 'Nguyen Van A',
    passwordHash: await hashPassword('123456'),
    email: 'vana@example.com',
    phone: '0912345678',
    isActive,
    roles: [{ id: 2, name: 'employee' }],
    permissionCodes: ['dashboard.view'],
  };

  const authRepository: IAuthRepository = {
    async findUserByEmail(email) {
      return email === user.email ? user : null;
    },
    async findUserById(id) {
      return id === user.id ? user : null;
    },
  };
  const refreshRepository = new MemoryRefreshTokenRepository();
  const tokenService = new TokenService();
  let revokedUserId: number | null = null;
  const sessionService = {
    async revokeAllForUser(userId: number) {
      revokedUserId = userId;
      await refreshRepository.revokeAllByUserId(userId);
    },
  } as unknown as SessionService;

  const service = new AuthService(
    authRepository,
    refreshRepository,
    tokenService,
    userServiceOverride ?? ({} as UserService),
    sessionService,
  );

  return {
    service,
    tokenService,
    refreshRepository,
    user,
    getRevokedUserId: () => revokedUserId,
  };
}

test('login returns a safe user, access token and a persisted refresh session', async () => {
  const harness = await createAuthHarness();

  const result = await harness.service.login({
    email: harness.user.email,
    password: '123456',
  });

  assert.ok(result.accessToken.length > 0);
  assert.ok(result.refreshToken.length > 0);
  assert.deepEqual(result.user.permissionCodes, ['dashboard.view']);
  assert.equal('password' in result.user, false);
  assert.equal('passwordHash' in result.user, false);
  assert.equal(harness.refreshRepository.tokens.size, 1);

  const persisted = [...harness.refreshRepository.tokens.values()][0];
  assert.equal(persisted?.userId, harness.user.id);
  assert.equal(persisted?.isUsed, false);
  assert.equal(persisted?.isRevoked, false);
});

test('unknown email and wrong password return the same credential error', async () => {
  const harness = await createAuthHarness();

  for (const input of [
    { email: 'missing@example.com', password: '123456' },
    { email: harness.user.email, password: 'wrong-password' },
  ]) {
    await assert.rejects(
      harness.service.login(input),
      (error) =>
        error instanceof AuthError && error.code === 'INVALID_CREDENTIALS',
    );
  }
});

test('inactive user receives the same generic login error as invalid credentials', async () => {
  const { service } = await createAuthHarness(false);

  await assert.rejects(
    service.login({ email: 'vana@example.com', password: '123456' }),
    (error) =>
      error instanceof AuthError && error.code === 'INVALID_CREDENTIALS',
  );
});

test('refresh for an inactive user revokes all sessions and returns a generic refresh error', async () => {
  const harness = await createAuthHarness(false);
  const issued = harness.tokenService.createRefreshToken(1);
  await harness.refreshRepository.create({
    jti: issued.jti,
    userId: 1,
    familyId: issued.familyId,
    expiresAt: issued.expiresAt,
  });

  await assert.rejects(
    harness.service.refresh(issued.token),
    (error) =>
      error instanceof AuthError && error.code === 'INVALID_REFRESH_TOKEN',
  );
  assert.equal(harness.getRevokedUserId(), 1);
});

test('a valid refresh rotates the token inside the same family', async () => {
  const harness = await createAuthHarness(true);
  const issued = harness.tokenService.createRefreshToken(1);
  await harness.refreshRepository.create({
    jti: issued.jti,
    userId: 1,
    familyId: issued.familyId,
    expiresAt: issued.expiresAt,
  });

  const refreshed = await harness.service.refresh(issued.token);
  const nextPayload = harness.tokenService.verifyRefreshToken(
    refreshed.refreshToken,
  );

  assert.ok(refreshed.accessToken.length > 0);
  assert.ok(nextPayload);
  assert.notEqual(nextPayload.jti, issued.jti);
  assert.equal(nextPayload.familyId, issued.familyId);
  assert.equal(harness.refreshRepository.tokens.get(issued.jti)?.isUsed, true);
  assert.equal(
    harness.refreshRepository.tokens.get(nextPayload.jti)?.isRevoked,
    false,
  );
});

test('invalid refresh token is rejected and logout revokes a valid family', async () => {
  const harness = await createAuthHarness(true);

  await assert.rejects(
    harness.service.refresh('not-a-jwt'),
    (error) =>
      error instanceof AuthError && error.code === 'INVALID_REFRESH_TOKEN',
  );

  const issued = harness.tokenService.createRefreshToken(1);
  await harness.refreshRepository.create({
    jti: issued.jti,
    userId: 1,
    familyId: issued.familyId,
    expiresAt: issued.expiresAt,
  });

  await harness.service.logout();
  assert.equal(harness.refreshRepository.tokens.get(issued.jti)?.isRevoked, false);

  await harness.service.logout(issued.token);
  assert.equal(harness.refreshRepository.tokens.get(issued.jti)?.isRevoked, true);
});

test('two concurrent refresh requests allow one rotation and detect reuse on the other', async () => {
  const harness = await createAuthHarness(true);
  const issued = harness.tokenService.createRefreshToken(1);
  await harness.refreshRepository.create({
    jti: issued.jti,
    userId: 1,
    familyId: issued.familyId,
    expiresAt: issued.expiresAt,
  });

  const results = await Promise.allSettled([
    harness.service.refresh(issued.token),
    harness.service.refresh(issued.token),
  ]);

  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(
    results.filter(
      (result) =>
        result.status === 'rejected' &&
        result.reason instanceof AuthError &&
        result.reason.code === 'REFRESH_TOKEN_REUSED',
    ).length,
    1,
  );
  assert.equal(
    [...harness.refreshRepository.tokens.values()]
      .filter((token) => token.familyId === issued.familyId)
      .every((token) => token.isRevoked),
    true,
  );
});

test('register delegates to UserService without role IDs and maps user errors', async () => {
  let capturedInput: unknown;
  const userService = {
    async create(input: unknown) {
      capturedInput = input;
      return {};
    },
  } as unknown as UserService;
  const harness = await createAuthHarness(true, userService);
  const input = {
    departmentId: 1,
    name: 'Public Register',
    password: '123456',
    email: 'public@example.com',
    phone: '0900000000',
  };

  await harness.service.register(input);
  assert.deepEqual(capturedInput, input);
  assert.equal(
    'roleIds' in (capturedInput as Record<string, unknown>),
    false,
  );

  const errorCases = [
    ['EMAIL_IN_USE', 'EMAIL_IN_USE'],
    ['PHONE_IN_USE', 'PHONE_IN_USE'],
    ['INVALID_DEPARTMENT', 'INVALID_DEPARTMENT'],
  ] as const;

  for (const [userCode, authCode] of errorCases) {
    const failingUserService = {
      async create() {
        throw new UserError(userCode);
      },
    } as unknown as UserService;
    const failingHarness = await createAuthHarness(true, failingUserService);

    await assert.rejects(
      failingHarness.service.register(input),
      (error) => error instanceof AuthError && error.code === authCode,
    );
  }
});
