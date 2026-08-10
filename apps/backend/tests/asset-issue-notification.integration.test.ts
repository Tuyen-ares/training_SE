import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'node:http';

test('Asset issue and notification APIs enforce lifecycle and ownership', async (context) => {
  const [{ default: app }, { default: prisma }, { TokenService }] = await Promise.all([
    import('../src/app.js'),
    import('../src/prisma.js'),
    import('../src/services/token.service.js'),
  ]);
  const department = await prisma.departments.findFirst({ select: { id: true } });
  assert.ok(department, 'A department seed is required');
  const suffix = `${Date.now()}`.slice(-7);
  const created = { userIds: [] as number[], assetIds: [] as number[], issueIds: [] as number[], modelIds: [] as number[], brandIds: [] as number[], typeIds: [] as number[] };
  const server: Server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const tokenService = new TokenService();
  const request = async (path: string, token: string, init: RequestInit = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    return { status: response.status, body: await response.json().catch(() => null) as any };
  };

  context.after(async () => {
    await prisma.notifications.deleteMany({ where: { recipient_user_id: { in: created.userIds } } });
    await prisma.asset_issues.deleteMany({ where: { id: { in: created.issueIds } } });
    await prisma.assets.deleteMany({ where: { id: { in: created.assetIds } } });
    await prisma.users.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.asset_models.deleteMany({ where: { id: { in: created.modelIds } } });
    await prisma.brands.deleteMany({ where: { id: { in: created.brandIds } } });
    await prisma.asset_types.deleteMany({ where: { id: { in: created.typeIds } } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const type = await prisma.asset_types.create({ data: { name: `Issue Type ${suffix}` } });
  const brand = await prisma.brands.create({ data: { name: `Issue Brand ${suffix}` } });
  const model = await prisma.asset_models.create({ data: { asset_type_id: type.id, brand_id: brand.id, name: `Issue Model ${suffix}` } });
  created.typeIds.push(type.id); created.brandIds.push(brand.id); created.modelIds.push(model.id);
  const asset = await prisma.assets.create({ data: { asset_model_id: model.id, department_id: department.id, serial_number: `ISS-${suffix}`, qr_code: crypto.randomUUID() } });
  created.assetIds.push(asset.id);
  const rejectAsset = await prisma.assets.create({ data: { asset_model_id: model.id, department_id: department.id, serial_number: `ISS-REJECT-${suffix}`, qr_code: crypto.randomUUID() } });
  const failAsset = await prisma.assets.create({ data: { asset_model_id: model.id, department_id: department.id, serial_number: `ISS-FAIL-${suffix}`, qr_code: crypto.randomUUID() } });
  created.assetIds.push(rejectAsset.id, failAsset.id);
  const reporter = await prisma.users.create({ data: { user_code: `BI26${suffix}1`, department_id: department.id, name: 'Issue Reporter', email: `issue.reporter.${suffix}@test.local`, phone: `81${suffix}0`.slice(0, 10), password: 'not-used' } });
  const handler = await prisma.users.create({ data: { user_code: `BI26${suffix}2`, department_id: department.id, name: 'Issue Handler', email: `issue.handler.${suffix}@test.local`, phone: `82${suffix}0`.slice(0, 10), password: 'not-used' } });
  created.userIds.push(reporter.id, handler.id);

  const reporterToken = tokenService.createAccessToken(reporter.id, ['asset_issue.report']);
  const handlerToken = tokenService.createAccessToken(handler.id, ['asset_issue.view', 'asset_issue.create', 'asset_issue.update', 'asset_issue.close']);

  const report = await request(`/assets/${asset.id}/report-damaged`, reporterToken, {
    method: 'POST', body: JSON.stringify({ description: 'Display flickers intermittently' }),
  });
  assert.equal(report.status, 201, JSON.stringify(report.body));
  const issueId = Number(report.body.data.id);
  created.issueIds.push(issueId);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: asset.id } })).status, 'available');

  const rejectReport = await request(`/assets/${rejectAsset.id}/report-damaged`, reporterToken, {
    method: 'POST', body: JSON.stringify({ description: 'Rejectable issue' }),
  });
  assert.equal(rejectReport.status, 201, JSON.stringify(rejectReport.body));
  const rejectIssueId = Number(rejectReport.body.data.id);
  created.issueIds.push(rejectIssueId);
  const rejected = await request(`/asset-issues/${rejectIssueId}/reject`, handlerToken, {
    method: 'POST', body: '{}',
  });
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
  assert.equal(rejected.body.data.status, 'REJECTED');
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: rejectAsset.id } })).status, 'available');

  const failReport = await request(`/assets/${failAsset.id}/report-damaged`, reporterToken, {
    method: 'POST', body: JSON.stringify({ description: 'Repair failure test' }),
  });
  assert.equal(failReport.status, 201, JSON.stringify(failReport.body));
  const failIssueId = Number(failReport.body.data.id);
  created.issueIds.push(failIssueId);
  assert.equal((await request(`/asset-issues/${failIssueId}/confirm`, handlerToken, { method: 'POST' })).status, 200);
  assert.equal((await request(`/asset-issues/${failIssueId}/start-repair`, handlerToken, { method: 'POST', body: '{}' })).status, 200);
  const failed = await request(`/asset-issues/${failIssueId}/fail`, handlerToken, {
    method: 'POST', body: JSON.stringify({ result: 'Repair not economical' }),
  });
  assert.equal(failed.status, 200, JSON.stringify(failed.body));
  assert.equal(failed.body.data.status, 'FAILED');
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: failAsset.id } })).status, 'damaged');

  const list = await request('/asset-issues?status=REPORTED', handlerToken);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.items.some((item: any) => item.id === issueId));
  assert.equal((await request(`/asset-issues/${issueId}/confirm`, handlerToken, { method: 'POST' })).status, 200);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: asset.id } })).status, 'damaged');
  assert.equal((await request(`/asset-issues/${issueId}/start-repair`, handlerToken, { method: 'POST', body: '{}' })).status, 200);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: asset.id } })).status, 'in_repair');
  assert.equal((await request(`/asset-issues/${issueId}/complete`, handlerToken, {
    method: 'POST', body: JSON.stringify({ result: 'Display cable replaced', cost: 250000 }),
  })).status, 200);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: asset.id } })).status, 'available');

  const ownNotifications = await request('/notifications', reporterToken);
  assert.equal(ownNotifications.status, 200);
  assert.ok(ownNotifications.body.data.unreadCount >= 3);
  const notificationId = ownNotifications.body.data.items[0].id;
  assert.equal((await request(`/notifications/${notificationId}/read`, reporterToken, { method: 'PATCH' })).status, 200);
  assert.equal((await request('/notifications/unread-count', reporterToken)).status, 200);
  assert.equal((await request('/notifications/read-all', reporterToken, { method: 'PATCH' })).status, 200);
  assert.equal((await request(`/notifications/${notificationId}/read`, handlerToken, { method: 'PATCH' })).status, 404);
});
