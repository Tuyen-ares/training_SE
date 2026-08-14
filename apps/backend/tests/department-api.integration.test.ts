import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';

test('Department API separates information updates from lifecycle status', async (context) => {
  const [{ default: app }, { default: prisma }, { TokenService }] = await Promise.all([
    import('../src/app.js'),
    import('../src/prisma.js'),
    import('../src/services/token.service.js'),
  ]);

  const suffix = `${Date.now()}`.slice(-8);
  const department = await prisma.departments.create({ data: { name: `Status Department ${suffix}` } });
  const server: Server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const tokenService = new TokenService();
  const managerToken = tokenService.createAccessToken(1, [
    'department.view',
    'department.create',
    'department.update',
    'department.manage_status',
  ]);
  const statusOnlyToken = tokenService.createAccessToken(1, ['department.manage_status']);
  const updateOnlyToken = tokenService.createAccessToken(1, ['department.update']);
  const request = async (path: string, token: string, init: RequestInit = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    return { status: response.status, body: await response.json().catch(() => null) as any };
  };

  context.after(async () => {
    await prisma.departments.deleteMany({ where: { id: department.id } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const list = await request('/departments', managerToken);
  assert.equal(list.status, 200, JSON.stringify(list.body));
  assert.equal(list.body.data.some((item: any) => item.id === department.id && item.isActive === true), true);

  const statusInInfoUpdate = await request(`/departments/${department.id}`, managerToken, {
    method: 'PATCH',
    body: JSON.stringify({ name: `Renamed Department ${suffix}`, isActive: false }),
  });
  assert.equal(statusInInfoUpdate.status, 400);

  const forbiddenStatus = await request(`/departments/${department.id}/status`, updateOnlyToken, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: false }),
  });
  assert.equal(forbiddenStatus.status, 403);

  const deactivated = await request(`/departments/${department.id}/status`, statusOnlyToken, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: false }),
  });
  assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body));
  assert.equal(deactivated.body.data.isActive, false);

  const reactivated = await request(`/departments/${department.id}/status`, statusOnlyToken, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: true }),
  });
  assert.equal(reactivated.status, 200, JSON.stringify(reactivated.body));
  assert.equal(reactivated.body.data.isActive, true);

  const deleteResponse = await request(`/departments/${department.id}`, managerToken, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 404);
});
