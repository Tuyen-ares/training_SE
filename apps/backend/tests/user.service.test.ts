import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  CreateUserData,
  UpdateUserData,
  UserResponseDto,
} from '../src/models/user.model.js';
import type { IUserRepository } from '../src/repositories/user.repository.js';
import type { RbacService } from '../src/services/rbac.service.js';
import type { SessionService } from '../src/services/session.service.js';
import { UserService } from '../src/services/user.service.js';
import { RbacError, UserError } from '../src/shared/app-error.js';
import type { PrismaTransaction } from '../src/shared/prisma-transaction.js';
import { verifyPassword } from '../src/shared/security/password-hasher.js';

interface HarnessOptions {
  emailExists?: boolean;
  phoneExists?: boolean;
  departmentExists?: boolean;
}

function createHarness(options: HarnessOptions = {}) {
  let user: UserResponseDto | null = null;
  let storedPasswordHash = '';
  let revokedUserId: number | null = null;
  let assignedRoleIds: number[] = [];

  const repository: IUserRepository = {
    async findAll(isActive) {
      return user && (isActive === undefined || user.isActive === isActive)
        ? [structuredClone(user)]
        : [];
    },
    async findById() {
      return user ? structuredClone(user) : null;
    },
    async emailExists() {
      return options.emailExists ?? false;
    },
    async phoneExists() {
      return options.phoneExists ?? false;
    },
    async departmentExists() {
      return options.departmentExists ?? true;
    },
    async create(data: CreateUserData) {
      storedPasswordHash = data.passwordHash;
      user = {
        id: 1,
        departmentId: data.departmentId,
        department: { id: data.departmentId, name: 'IT' },
        name: data.name,
        email: data.email,
        phone: data.phone,
        isActive: true,
        roles: [],
      };
      return 1;
    },
    async update(_id: number, data: UpdateUserData) {
      if (!user) return;
      if (data.passwordHash) storedPasswordHash = data.passwordHash;
      user = {
        ...user,
        ...(data.departmentId
          ? {
              departmentId: data.departmentId,
              department: { id: data.departmentId, name: 'Accounting' },
            }
          : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
      };
    },
    async setActive(_id: number, isActive: boolean) {
      if (!user) return false;
      user = { ...user, isActive };
      return true;
    },
  };

  const rbacService = {
    async resolveInitialRoleIds(roleIds?: number[]) {
      if (roleIds?.includes(999)) {
        throw new RbacError('INVALID_ROLE_SET');
      }
      return roleIds?.length ? [...new Set(roleIds)] : [2];
    },
    async validateRoleIds(roleIds: number[]) {
      if (roleIds.length === 0 || roleIds.includes(999)) {
        throw new RbacError('INVALID_ROLE_SET');
      }
      return [...new Set(roleIds)];
    },
    async assignRoles(
      _userId: number,
      roleIds: number[],
      _transaction: PrismaTransaction,
    ) {
      assignedRoleIds = roleIds;
      if (user) {
        user = {
          ...user,
          roles: roleIds.map((id) => ({
            id,
            name: id === 2 ? 'staff' : 'asset_manager',
          })),
        };
      }
    },
  } as unknown as RbacService;

  const sessionService = {
    async revokeAllForUser(userId: number) {
      revokedUserId = userId;
    },
  } as unknown as SessionService;

  const prisma = {
    async $transaction<T>(
      operation: (transaction: PrismaTransaction) => Promise<T>,
    ): Promise<T> {
      return operation({} as PrismaTransaction);
    },
  };

  return {
    service: new UserService(
      repository,
      rbacService,
      sessionService,
      prisma as never,
    ),
    getStoredPasswordHash: () => storedPasswordHash,
    getRevokedUserId: () => revokedUserId,
    getAssignedRoleIds: () => assignedRoleIds,
    getUser: () => (user ? structuredClone(user) : null),
  };
}

test('create hashes password, assigns staff by default and never returns password', async () => {
  const harness = createHarness();
  const result = await harness.service.create({
    departmentId: 1,
    name: 'Nguyen Van A',
    email: 'vana@example.com',
    phone: '0912345678',
    password: '123456',
  });

  assert.deepEqual(harness.getAssignedRoleIds(), [2]);
  assert.equal(result.roles[0]?.name, 'staff');
  assert.equal('password' in result, false);
  assert.equal('passwordHash' in result, false);
  assert.equal(
    await verifyPassword('123456', harness.getStoredPasswordHash()),
    true,
  );
});

test('create assigns explicitly selected roles instead of the staff default', async () => {
  const harness = createHarness();
  const result = await harness.service.create({
    departmentId: 1,
    name: 'Le Thi B',
    email: 'thib@example.com',
    phone: '0987654321',
    password: '123456',
    roleIds: [3],
  });

  assert.deepEqual(harness.getAssignedRoleIds(), [3]);
  assert.deepEqual(result.roles, [{ id: 3, name: 'asset_manager' }]);
});

test('deactivate keeps the user record and revokes every refresh token session', async () => {
  const harness = createHarness();
  await harness.service.create({
    departmentId: 1,
    name: 'Nguyen Van A',
    email: 'vana@example.com',
    phone: '0912345678',
    password: '123456',
  });

  assert.equal(await harness.service.deactivate(1), true);
  assert.equal((await harness.service.getById(1))?.isActive, false);
  assert.equal(harness.getRevokedUserId(), 1);
});

test('create reports duplicate email, duplicate phone and invalid department', async () => {
  const input = {
    departmentId: 1,
    name: 'Nguyen Van A',
    email: 'vana@example.com',
    phone: '0912345678',
    password: '123456',
  };
  const cases = [
    [{ emailExists: true }, 'EMAIL_IN_USE'],
    [{ phoneExists: true }, 'PHONE_IN_USE'],
    [{ departmentExists: false }, 'INVALID_DEPARTMENT'],
  ] as const;

  for (const [options, expectedCode] of cases) {
    const harness = createHarness(options);
    await assert.rejects(
      harness.service.create(input),
      (error) =>
        error instanceof UserError && error.code === expectedCode,
    );
    assert.equal(harness.getUser(), null);
  }
});

test('create maps an invalid explicit role set to UserError', async () => {
  const harness = createHarness();

  await assert.rejects(
    harness.service.create({
      departmentId: 1,
      name: 'Invalid Role',
      email: 'invalid@example.com',
      phone: '0900000000',
      password: '123456',
      roleIds: [999],
    }),
    (error) =>
      error instanceof UserError && error.code === 'INVALID_ROLE_SET',
  );
});

test('partial update changes only supplied fields, rehashes password and replaces roles', async () => {
  const harness = createHarness();
  const original = await harness.service.create({
    departmentId: 1,
    name: 'Nguyen Van A',
    email: 'vana@example.com',
    phone: '0912345678',
    password: '123456',
  });
  const originalHash = harness.getStoredPasswordHash();

  const updated = await harness.service.update(original.id, {
    name: 'Nguyen Van A Updated',
    password: 'new-password',
    roleIds: [3, 3],
  });

  assert.equal(updated?.name, 'Nguyen Van A Updated');
  assert.equal(updated?.email, original.email);
  assert.equal(updated?.phone, original.phone);
  assert.deepEqual(updated?.roles, [{ id: 3, name: 'asset_manager' }]);
  assert.notEqual(harness.getStoredPasswordHash(), originalHash);
  assert.equal(
    await verifyPassword('new-password', harness.getStoredPasswordHash()),
    true,
  );
});

test('activate and status filters expose active/inactive state without deleting the user', async () => {
  const harness = createHarness();
  await harness.service.create({
    departmentId: 1,
    name: 'Nguyen Van A',
    email: 'vana@example.com',
    phone: '0912345678',
    password: '123456',
  });

  await harness.service.deactivate(1);
  assert.equal((await harness.service.getAll('active')).length, 0);
  assert.equal((await harness.service.getAll('inactive')).length, 1);
  assert.equal((await harness.service.getAll('all')).length, 1);

  const activated = await harness.service.activate(1);
  assert.equal(activated?.isActive, true);
  assert.equal((await harness.service.getAll('active')).length, 1);
});

test('update, activate and deactivate return not found when the user does not exist', async () => {
  const harness = createHarness();

  assert.equal(await harness.service.update(999, { name: 'Missing' }), null);
  assert.equal(await harness.service.activate(999), null);
  assert.equal(await harness.service.deactivate(999), false);
});
