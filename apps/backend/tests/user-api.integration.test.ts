import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import test from 'node:test';
import { verifyPassword } from '../src/shared/security/password-hasher.js';

test('User API creates safe responses, enforces role.assign and deactivates instead of deleting', async (context) => {
  const [{ default: app }, { default: prisma }, { TokenService }] = await Promise.all([
    import('../src/app.js'),
    import('../src/prisma.js'),
    import('../src/services/token.service.js'),
  ]);

  const department = await prisma.departments.findFirst({
    select: { id: true },
  });
  const staffRole = await prisma.roles.findUnique({
    where: { name: 'staff' },
    select: { id: true },
  });
  const managerRole = await prisma.roles.findUnique({
    where: { name: 'asset_manager' },
    select: { id: true },
  });

  assert.ok(department, 'A department seed is required');
  assert.ok(staffRole, 'The staff role seed is required');
  assert.ok(managerRole, 'The asset_manager role seed is required');

  const server: Server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const createdUserIds: number[] = [];

  context.after(async () => {
    await prisma.users.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const tokenService = new TokenService();
  const fullAccessToken = tokenService.createAccessToken(1, [
    'user.view',
    'user.create',
    'user.update',
    'user.delete',
    'role.assign',
  ]);
  const createOnlyToken = tokenService.createAccessToken(1, ['user.create']);
  const suffix = Date.now().toString().slice(-8);

  async function request(
    path: string,
    token: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: any }> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  }

  const explicitRoleResponse = await request('/users', fullAccessToken, {
    method: 'POST',
    body: JSON.stringify({
      departmentId: department.id,
      name: 'Codex Manager Test',
      email: `manager.${suffix}@test.local`,
      phone: `08${suffix}`,
      password: '123456',
      roleIds: [managerRole.id],
    }),
  });

  assert.equal(explicitRoleResponse.status, 201);
  createdUserIds.push(explicitRoleResponse.body.data.id);
  assert.equal(explicitRoleResponse.body.data.roles[0].name, 'asset_manager');
  assert.equal('password' in explicitRoleResponse.body.data, false);
  assert.equal('passwordHash' in explicitRoleResponse.body.data, false);

  const persistedCredentials = await prisma.users.findUnique({
    where: { id: explicitRoleResponse.body.data.id },
    select: { password: true },
  });
  assert.ok(persistedCredentials);
  assert.notEqual(persistedCredentials.password, '123456');
  assert.equal(
    await verifyPassword('123456', persistedCredentials.password),
    true,
  );

  const readResponse = await request(
    `/users/${explicitRoleResponse.body.data.id}`,
    fullAccessToken,
  );
  assert.equal(readResponse.status, 200);
  assert.equal('password' in readResponse.body.data, false);

  const forbiddenResponse = await request('/users', createOnlyToken, {
    method: 'POST',
    body: JSON.stringify({
      departmentId: department.id,
      name: 'Forbidden Role Test',
      email: `forbidden.${suffix}@test.local`,
      phone: `07${suffix}`,
      password: '123456',
      roleIds: [managerRole.id],
    }),
  });
  assert.equal(forbiddenResponse.status, 403);

  const invalidRoleEmail = `invalid-role.${suffix}@test.local`;
  const invalidRoleResponse = await request('/users', fullAccessToken, {
    method: 'POST',
    body: JSON.stringify({
      departmentId: department.id,
      name: 'Invalid Role Test',
      email: invalidRoleEmail,
      phone: `06${suffix}`,
      password: '123456',
      roleIds: [999_999],
    }),
  });
  assert.equal(invalidRoleResponse.status, 400);
  assert.equal(
    await prisma.users.findUnique({
      where: { email: invalidRoleEmail },
      select: { id: true },
    }),
    null,
  );

  const defaultRoleResponse = await request('/users', createOnlyToken, {
    method: 'POST',
    body: JSON.stringify({
      departmentId: department.id,
      name: 'Codex Staff Test',
      email: `staff.${suffix}@test.local`,
      phone: `09${suffix}`,
      password: '123456',
    }),
  });
  assert.equal(defaultRoleResponse.status, 201);
  createdUserIds.push(defaultRoleResponse.body.data.id);
  assert.equal(defaultRoleResponse.body.data.roles[0].id, staffRole.id);

  const refreshJti = randomUUID();
  await prisma.refresh_tokens.create({
    data: {
      jti: refreshJti,
      user_id: explicitRoleResponse.body.data.id,
      family_id: randomUUID(),
      expires_at: new Date(Date.now() + 60_000),
    },
  });

  const deleteResponse = await request(
    `/users/${explicitRoleResponse.body.data.id}`,
    fullAccessToken,
    { method: 'DELETE' },
  );
  assert.equal(deleteResponse.status, 204);

  const deactivatedUser = await prisma.users.findUnique({
    where: { id: explicitRoleResponse.body.data.id },
    select: { is_active: true },
  });
  assert.deepEqual(deactivatedUser, { is_active: false });

  const revokedToken = await prisma.refresh_tokens.findUnique({
    where: { jti: refreshJti },
    select: { is_revoked: true },
  });
  assert.deepEqual(revokedToken, { is_revoked: true });
});
