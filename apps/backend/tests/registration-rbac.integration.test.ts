import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';

test('registration requests are concurrency-safe and approval/rejection clear credentials atomically', async (context) => {
  const [{ default: app }, { default: prisma }, { TokenService }] = await Promise.all([
    import('../src/app.js'),
    import('../src/prisma.js'),
    import('../src/services/token.service.js'),
  ]);

  const [department, employeeRole, managerRole, reviewer] = await Promise.all([
    prisma.departments.findFirst({ select: { id: true } }),
    prisma.roles.findUnique({ where: { name: 'employee' }, select: { id: true } }),
    prisma.roles.findUnique({ where: { name: 'asset_manager' }, select: { id: true } }),
    prisma.users.findFirst({ where: { is_active: true }, select: { id: true } }),
  ]);
  assert.ok(department && employeeRole && managerRole && reviewer, 'Baseline department, roles and reviewer are required');

  const server: Server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const requestIds: number[] = [];
  const userIds: number[] = [];
  const roleIds: number[] = [];

  context.after(async () => {
    await prisma.registration_requests.deleteMany({ where: { id: { in: requestIds } } });
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });
    await prisma.roles.deleteMany({ where: { id: { in: roleIds } } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const reviewToken = new TokenService().createAccessToken(reviewer.id, [
    'user_registration.review',
    'role.view',
    'role.create',
    'role.update',
    'role.assign',
    'permission.view',
  ]);
  const suffix = Date.now().toString().slice(-8);

  async function request(path: string, init: RequestInit = {}, token?: string) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    return { status: response.status, body: response.status === 204 ? null : isJson ? await response.json() : await response.text() };
  }

  const sharedEmail = `pending.${suffix}@test.local`;
  const concurrentEmail = await Promise.all([
    request('/registration-requests', { method: 'POST', body: JSON.stringify({ name: 'Pending One', email: sharedEmail, phone: `06${suffix}`, password: '123456' }) }),
    request('/registration-requests', { method: 'POST', body: JSON.stringify({ name: 'Pending Two', email: sharedEmail.toUpperCase(), phone: `07${suffix}`, password: '123456' }) }),
  ]);
  assert.deepEqual(concurrentEmail.map(({ status }) => status).sort(), [201, 409]);
  const approvedRequestId = concurrentEmail.find(({ status }) => status === 201)!.body.data.id;
  requestIds.push(approvedRequestId);

  const sharedPhone = `08${suffix}`;
  const concurrentPhone = await Promise.all([
    request('/registration-requests', { method: 'POST', body: JSON.stringify({ name: 'Phone One', email: `phone1.${suffix}@test.local`, phone: sharedPhone, password: '123456' }) }),
    request('/registration-requests', { method: 'POST', body: JSON.stringify({ name: 'Phone Two', email: `phone2.${suffix}@test.local`, phone: sharedPhone, password: '123456' }) }),
  ]);
  assert.deepEqual(concurrentPhone.map(({ status }) => status).sort(), [201, 409]);
  const rejectedRequestId = concurrentPhone.find(({ status }) => status === 201)!.body.data.id;
  requestIds.push(rejectedRequestId);

  assert.equal((await request('/registration-requests')).status, 401);
  const listResponse = await request('/registration-requests?status=PENDING', {}, reviewToken);
  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.body.data.items.some((item: { id: number }) => item.id === approvedRequestId));

  const pendingRow = await prisma.registration_requests.findUnique({
    where: { id: approvedRequestId },
    select: { password_hash: true, pending_email_key: true, created_user_id: true },
  });
  assert.ok(pendingRow?.password_hash);
  assert.equal(pendingRow.created_user_id, null);

  const approveResponse = await request(`/registration-requests/${approvedRequestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ departmentId: department.id, roleIds: [employeeRole.id, managerRole.id] }),
  }, reviewToken);
  assert.equal(approveResponse.status, 200);
  assert.equal(approveResponse.body.data.status, 'APPROVED');
  userIds.push(approveResponse.body.data.createdUser.id);

  const approvedRow = await prisma.registration_requests.findUnique({
    where: { id: approvedRequestId },
    select: { password_hash: true, pending_email_key: true, pending_phone_key: true, created_user_id: true },
  });
  assert.deepEqual(approvedRow, {
    password_hash: null,
    pending_email_key: null,
    pending_phone_key: null,
    created_user_id: userIds[0],
  });
  const createdUser = await prisma.users.findUnique({
    where: { id: userIds[0] },
    select: { user_code: true, department_id: true, is_active: true, user_roles: { select: { role_id: true } } },
  });
  assert.match(createdUser!.user_code, /^BI\d{5,}$/);
  assert.equal(createdUser!.department_id, department.id);
  assert.equal(createdUser!.is_active, true);
  assert.deepEqual(createdUser!.user_roles.map(({ role_id }) => role_id).sort(), [employeeRole.id, managerRole.id].sort());
  assert.equal((await request(`/registration-requests/${approvedRequestId}/approve`, { method: 'POST', body: JSON.stringify({ departmentId: department.id }) }, reviewToken)).status, 409);

  const rejectResponse = await request(`/registration-requests/${rejectedRequestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, reviewToken);
  assert.equal(rejectResponse.status, 200);
  assert.equal(rejectResponse.body.data.status, 'REJECTED');
  const rejectedRow = await prisma.registration_requests.findUnique({
    where: { id: rejectedRequestId },
    select: { password_hash: true, pending_email_key: true, pending_phone_key: true, rejection_reason: true, created_user_id: true },
  });
  assert.deepEqual(rejectedRow, { password_hash: null, pending_email_key: null, pending_phone_key: null, rejection_reason: null, created_user_id: null });

  const retryResponse = await request('/registration-requests', {
    method: 'POST',
    body: JSON.stringify({ name: 'Retry Phone', email: `retry.${suffix}@test.local`, phone: sharedPhone, password: '123456' }),
  });
  assert.equal(retryResponse.status, 201);
  requestIds.push(retryResponse.body.data.id);

  const permissionResponse = await request('/rbac/permissions', {}, reviewToken);
  assert.equal(permissionResponse.status, 200);
  const selectablePermissions = permissionResponse.body.data.filter(
    (permission: { code: string }) => ['dashboard.view', 'asset.view'].includes(permission.code),
  );
  assert.equal(selectablePermissions.length, 2);

  const createRoleResponse = await request('/rbac/roles', {
    method: 'POST',
    body: JSON.stringify({ name: `test_role_${suffix}`, permissionIds: [selectablePermissions[0].id] }),
  }, reviewToken);
  assert.equal(createRoleResponse.status, 201);
  roleIds.push(createRoleResponse.body.data.id);
  assert.equal(createRoleResponse.body.data.isSystem, false);
  assert.equal(createRoleResponse.body.data.permissions.length, 1);

  const renameRoleResponse = await request(`/rbac/roles/${roleIds[0]}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: `updated_role_${suffix}` }),
  }, reviewToken);
  assert.equal(renameRoleResponse.status, 200);
  assert.equal(renameRoleResponse.body.data.name, `updated_role_${suffix}`);

  const replacePermissionsResponse = await request(`/rbac/roles/${roleIds[0]}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds: selectablePermissions.map(({ id }: { id: number }) => id) }),
  }, reviewToken);
  assert.equal(replacePermissionsResponse.status, 200);
  assert.deepEqual(
    replacePermissionsResponse.body.data.permissions.map(({ id }: { id: number }) => id).sort(),
    selectablePermissions.map(({ id }: { id: number }) => id).sort(),
  );
  assert.equal((await request(`/rbac/roles/${managerRole.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: `forbidden_${suffix}` }),
  }, reviewToken)).status, 409);
  assert.equal((await request(`/rbac/roles/${roleIds[0]}`, { method: 'DELETE' }, reviewToken)).status, 404);
});
