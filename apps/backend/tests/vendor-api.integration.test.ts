import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';

test('Vendor API enforces lifecycle, filters and historical names', async (context) => {
  const [{ default: app }, { default: prisma }, { TokenService }] = await Promise.all([
    import('../src/app.js'),
    import('../src/prisma.js'),
    import('../src/services/token.service.js'),
  ]);
  const asset = await prisma.assets.findFirst({ select: { id: true } });
  assert.ok(asset, 'An asset seed is required');

  const suffix = `${Date.now()}`.slice(-8);
  const createdVendorIds: number[] = [];
  const createdIssueIds: number[] = [];
  const server: Server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const tokenService = new TokenService();
  const managerToken = tokenService.createAccessToken(1, ['vendor.view', 'vendor.create', 'vendor.update']);
  const issueViewerToken = tokenService.createAccessToken(1, ['asset_issue.view']);
  const request = async (path: string, token: string, init: RequestInit = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    return { status: response.status, body: await response.json().catch(() => null) as any };
  };

  context.after(async () => {
    await prisma.asset_issues.deleteMany({ where: { id: { in: createdIssueIds } } });
    await prisma.vendors.deleteMany({ where: { id: { in: createdVendorIds } } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const created = await request('/vendors', managerToken, {
    method: 'POST',
    body: JSON.stringify({ name: `Vendor ${suffix}`, contactName: '  ', phone: '', email: 'contact@example.test', address: '  ' }),
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.data.isActive, true);
  assert.equal(created.body.data.contactName, null);
  assert.equal(created.body.data.phone, null);
  assert.equal(created.body.data.address, null);
  const vendorId = Number(created.body.data.id);
  createdVendorIds.push(vendorId);

  const deleteResponse = await request(`/vendors/${vendorId}`, managerToken, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 404);

  const deactivated = await request(`/vendors/${vendorId}`, managerToken, {
    method: 'PATCH', body: JSON.stringify({ isActive: false }),
  });
  assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body));
  assert.equal(deactivated.body.data.isActive, false);
  const activeList = await request('/vendors?isActive=true&page=1&pageSize=100', managerToken);
  assert.equal(activeList.status, 200);
  assert.equal(activeList.body.data.items.some((item: any) => item.id === vendorId), false);
  const allList = await request('/vendors?isActive=false&page=1&pageSize=100', managerToken);
  assert.equal(allList.body.data.items.some((item: any) => item.id === vendorId), true);

  const historical = await request('/vendors', managerToken, { method: 'POST', body: JSON.stringify({ name: `Historical ${suffix}` }) });
  assert.equal(historical.status, 201, JSON.stringify(historical.body));
  const historicalId = Number(historical.body.data.id);
  createdVendorIds.push(historicalId);
  const issue = await prisma.asset_issues.create({ data: { asset_id: asset.id, vendor_id: historicalId, status: 'COMPLETED', description: 'Vendor history test' } });
  createdIssueIds.push(issue.id);

  const renamed = await request(`/vendors/${historicalId}`, managerToken, { method: 'PATCH', body: JSON.stringify({ name: `Renamed ${suffix}` }) });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
  const historicalIssue = await request(`/asset-issues/${issue.id}`, issueViewerToken);
  assert.equal(historicalIssue.status, 200, JSON.stringify(historicalIssue.body));
  assert.equal(historicalIssue.body.data.vendor.name, `Renamed ${suffix}`);
});
