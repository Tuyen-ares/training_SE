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
  const employeeRole = await prisma.roles.findUnique({
    where: { name: 'employee' },
    select: { id: true },
  });
  const managerRole = await prisma.roles.findUnique({
    where: { name: 'asset_manager' },
    select: { id: true },
  });

  assert.ok(department, 'A department seed is required');
  assert.ok(employeeRole, 'The employee role seed is required');
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
    'user.manage_status',
    'role.assign',
  ]);
  const createOnlyToken = tokenService.createAccessToken(1, ['user.create']);
  const updateOnlyToken = tokenService.createAccessToken(1, ['user.update']);
  const statusOnlyToken = tokenService.createAccessToken(1, ['user.manage_status']);
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
  assert.match(explicitRoleResponse.body.data.userCode, /^BI\d{5,}$/);
  assert.equal(explicitRoleResponse.body.data.roles[0].name, 'asset_manager');
  assert.equal('password' in explicitRoleResponse.body.data, false);
  assert.equal('passwordHash' in explicitRoleResponse.body.data, false);

  const selfToken = tokenService.createAccessToken(
    explicitRoleResponse.body.data.id,
    [],
  );
  const selfReadResponse = await request('/users/me', selfToken);
  assert.equal(selfReadResponse.status, 200);
  assert.equal(selfReadResponse.body.data.id, explicitRoleResponse.body.data.id);
  assert.equal('password' in selfReadResponse.body.data, false);

  const selfAdminReadResponse = await request(
    `/users/${explicitRoleResponse.body.data.id}`,
    selfToken,
  );
  assert.equal(selfAdminReadResponse.status, 403);

  const forbiddenSelfUpdateResponse = await request('/users/me', selfToken, {
    method: 'PATCH',
    body: JSON.stringify({ departmentId: department.id, roleIds: [managerRole.id] }),
  });
  assert.equal(forbiddenSelfUpdateResponse.status, 400);

  const selfUpdateResponse = await request('/users/me', selfToken, {
    method: 'PATCH',
    body: JSON.stringify({
      name: 'Codex Manager Profile',
      phone: `05${suffix}`,
      avatarUrl: 'https://images.example.com/profile.jpg',
    }),
  });
  assert.equal(selfUpdateResponse.status, 200);
  assert.equal(selfUpdateResponse.body.data.name, 'Codex Manager Profile');
  assert.equal(selfUpdateResponse.body.data.email, explicitRoleResponse.body.data.email);

  const wrongPasswordResponse = await request('/users/me/password', selfToken, {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword: 'wrong-password', newPassword: 'new-password' }),
  });
  assert.equal(wrongPasswordResponse.status, 400);

  const passwordResponse = await request('/users/me/password', selfToken, {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword: '123456', newPassword: 'new-password' }),
  });
  assert.equal(passwordResponse.status, 204);

  const persistedCredentials = await prisma.users.findUnique({
    where: { id: explicitRoleResponse.body.data.id },
    select: { password: true },
  });
  assert.ok(persistedCredentials);
  assert.notEqual(persistedCredentials.password, '123456');
  assert.equal(
    await verifyPassword('new-password', persistedCredentials.password),
    true,
  );

  const readResponse = await request(
    `/users/${explicitRoleResponse.body.data.id}`,
    fullAccessToken,
  );
  assert.equal(readResponse.status, 200);
  assert.equal(readResponse.body.data.userCode, explicitRoleResponse.body.data.userCode);
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
      name: 'Codex Employee Test',
      email: `employee.${suffix}@test.local`,
      phone: `09${suffix}`,
      password: '123456',
    }),
  });
  assert.equal(defaultRoleResponse.status, 201);
  createdUserIds.push(defaultRoleResponse.body.data.id);
  assert.match(defaultRoleResponse.body.data.userCode, /^BI\d{5,}$/);
  assert.equal(defaultRoleResponse.body.data.roles[0].id, employeeRole.id);

  const refreshJti = randomUUID();
  await prisma.refresh_tokens.create({
    data: {
      jti: refreshJti,
      user_id: explicitRoleResponse.body.data.id,
      family_id: randomUUID(),
      expires_at: new Date(Date.now() + 60_000),
    },
  });

  const deactivateResponse = await request(
    `/users/${explicitRoleResponse.body.data.id}/status`,
    fullAccessToken,
    { method: 'PATCH', body: JSON.stringify({ isActive: false }) },
  );
  assert.equal(deactivateResponse.status, 200);

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

  const activateResponse = await request(
    `/users/${explicitRoleResponse.body.data.id}/status`,
    statusOnlyToken,
    { method: 'PATCH', body: JSON.stringify({ isActive: true }) },
  );
  assert.equal(activateResponse.status, 200);
  assert.equal(activateResponse.body.data.isActive, true);

  const forbiddenDeactivateResponse = await request(
    `/users/${explicitRoleResponse.body.data.id}/status`,
    updateOnlyToken,
    { method: 'PATCH', body: JSON.stringify({ isActive: false }) },
  );
  assert.equal(forbiddenDeactivateResponse.status, 403);

  const forbiddenActivateResponse = await request(
    `/users/${explicitRoleResponse.body.data.id}/status`,
    updateOnlyToken,
    { method: 'PATCH', body: JSON.stringify({ isActive: true }) },
  );
  assert.equal(forbiddenActivateResponse.status, 403);
});
