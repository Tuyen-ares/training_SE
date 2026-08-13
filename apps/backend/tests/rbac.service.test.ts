import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import type { RoleOptionDto } from '../src/models/rbac.model.js';
import {
  requirePermission,
  requireRoleAssignWhenRoleIdsProvided,
} from '../src/middleware/rbac.middleware.js';
import type { IRbacRepository } from '../src/repositories/rbac.repository.js';
import { RbacService } from '../src/services/rbac.service.js';
import { RbacError } from '../src/shared/app-error.js';
import type { PrismaTransaction } from '../src/shared/prisma-transaction.js';

class MemoryRbacRepository implements IRbacRepository {
  readonly roles: RoleOptionDto[] = [
    { id: 1, name: 'admin' },
  { id: 2, name: 'employee' },
    { id: 3, name: 'asset_manager' },
  ];
  readonly users = new Set([10]);
  readonly userRoles = new Map<number, number[]>();
  readonly permissions = [
    { id: 1, name: 'View users', code: 'user.view', description: 'View users.' },
  ];

  async findAllRoles(): Promise<RoleOptionDto[]> {
    return structuredClone(this.roles);
  }

  async findRoleOptions(): Promise<RoleOptionDto[]> { return structuredClone(this.roles); }
  async findRoleById() { return null; }
  async findAllPermissions() { return structuredClone(this.permissions); }

  async findRoleIdByName(name: string): Promise<number | null> {
    return this.roles.find((role) => role.name === name)?.id ?? null;
  }

  async findExistingRoleIds(roleIds: number[]): Promise<number[]> {
    return roleIds.filter((id) => this.roles.some((role) => role.id === id));
  }

  async userExists(userId: number): Promise<boolean> {
    return this.users.has(userId);
  }

  async replaceUserRoles(userId: number, roleIds: number[]): Promise<void> {
    this.userRoles.set(userId, [...roleIds]);
  }

  async findExistingPermissionIds(permissionIds: number[]): Promise<number[]> {
    return permissionIds.filter((id) => this.permissions.some((permission) => permission.id === id));
  }
  async createRole() { return 4; }
  async updateRoleName() {}
  async replaceRolePermissions() {}
  async lockEssentialPermissions(permissionCodes: string[]) { return permissionCodes.length; }
  async hasActiveUserWithPermissions() { return true; }
  async runInTransaction<T>(work: (transaction: PrismaTransaction) => Promise<T>): Promise<T> {
    return work({} as PrismaTransaction);
  }
}

test('listRoles returns role options and missing input resolves to employee', async () => {
  const repository = new MemoryRbacRepository();
  const service = new RbacService(repository);

  assert.deepEqual(await service.listRoles(), repository.roles);
  assert.deepEqual(await service.resolveInitialRoleIds(), [2]);
  assert.deepEqual(await service.resolveInitialRoleIds([]), [2]);
});

test('role validation removes duplicate IDs and rejects an invalid or empty set', async () => {
  const service = new RbacService(new MemoryRbacRepository());

  assert.deepEqual(await service.validateRoleIds([3, 2, 3]), [3, 2]);
  await assert.rejects(
    service.validateRoleIds([]),
    (error) =>
      error instanceof RbacError && error.code === 'INVALID_ROLE_SET',
  );
  await assert.rejects(
    service.validateRoleIds([2, 999]),
    (error) =>
      error instanceof RbacError && error.code === 'INVALID_ROLE_SET',
  );
});

test('missing configured default role is reported explicitly', async () => {
  const repository = new MemoryRbacRepository();
  repository.roles.splice(
  repository.roles.findIndex((role) => role.name === 'employee'),
    1,
  );
  const service = new RbacService(repository);

  await assert.rejects(
    service.resolveInitialRoleIds(),
    (error) =>
      error instanceof RbacError && error.code === 'DEFAULT_ROLE_NOT_FOUND',
  );
});

test('assignRoles validates and replaces roles using the caller transaction', async () => {
  const repository = new MemoryRbacRepository();
  const service = new RbacService(repository);
  const transaction = {} as PrismaTransaction;

  await service.assignRoles(10, [2, 3, 2], transaction);
  assert.deepEqual(repository.userRoles.get(10), [2, 3]);
});

test('replaceUserRoles rejects a missing user and replaces an existing user set', async () => {
  const repository = new MemoryRbacRepository();
  const service = new RbacService(repository);

  await assert.rejects(
    service.replaceUserRoles(999, [2]),
    (error) => error instanceof RbacError && error.code === 'USER_NOT_FOUND',
  );

  await service.replaceUserRoles(10, [1, 3]);
  assert.deepEqual(repository.userRoles.get(10), [1, 3]);
});

interface ResponseCapture {
  statusCode?: number;
  body?: unknown;
}

function createResponse(capture: ResponseCapture): Response {
  return {
    status(code: number) {
      capture.statusCode = code;
      return this;
    },
    json(body: unknown) {
      capture.body = body;
      return this;
    },
  } as unknown as Response;
}

function createRequest(
  permissionCodes?: string[],
  body?: unknown,
): Request {
  return {
    auth:
      permissionCodes === undefined
        ? undefined
        : { sub: 1, permissionCodes },
    body,
  } as Request;
}

test('requirePermission returns 401 without auth, 403 without permission and otherwise continues', () => {
  const middleware = requirePermission('user.create');

  const unauthorized = {};
  let nextCalls = 0;
  middleware(
    createRequest(),
    createResponse(unauthorized),
    () => {
      nextCalls += 1;
    },
  );
  assert.equal(unauthorized.statusCode, 401);

  const forbidden = {};
  middleware(
    createRequest(['user.view']),
    createResponse(forbidden),
    () => {
      nextCalls += 1;
    },
  );
  assert.equal(forbidden.statusCode, 403);

  middleware(
    createRequest(['user.create']),
    createResponse({}),
    () => {
      nextCalls += 1;
    },
  );
  assert.equal(nextCalls, 1);
});

test('role.assign is required only when user payload explicitly selects roles', () => {
  const middleware = requireRoleAssignWhenRoleIdsProvided();
  let nextCalls = 0;

  middleware(
    createRequest(['user.create'], {}),
    createResponse({}),
    () => {
      nextCalls += 1;
    },
  );
  middleware(
    createRequest(['user.create'], { roleIds: [] }),
    createResponse({}),
    () => {
      nextCalls += 1;
    },
  );
  assert.equal(nextCalls, 2);

  const forbidden = {};
  middleware(
    createRequest(['user.create'], { roleIds: [3] }),
    createResponse(forbidden),
    () => {
      nextCalls += 1;
    },
  );
  assert.equal(forbidden.statusCode, 403);

  middleware(
    createRequest(['user.create', 'role.assign'], { roleIds: [3] }),
    createResponse({}),
    () => {
      nextCalls += 1;
    },
  );
  assert.equal(nextCalls, 3);
});
