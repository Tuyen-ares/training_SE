import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'node:http';

test('Asset management APIs enforce the Release 1 read/write/catalog/retire/QR contract', async (context) => {
  const [{ default: app }, { default: prisma }, { TokenService }] = await Promise.all([
    import('../src/app.js'),
    import('../src/prisma.js'),
    import('../src/services/token.service.js'),
  ]);

  const department = await prisma.departments.findFirst({ select: { id: true } });
  assert.ok(department, 'A department seed is required');

  const suffix = `${Date.now()}`.slice(-7);
  const created = {
    assetIds: [] as number[],
    modelIds: [] as number[],
    brandIds: [] as number[],
    typeIds: [] as number[],
    userIds: [] as number[],
    requestIds: [] as number[],
    detailIds: [] as number[],
  };
  const server: Server = app.listen(0);
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const tokenService = new TokenService();

  const request = async (
    path: string,
    token: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: any }> => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };

  context.after(async () => {
    await prisma.asset_issues.deleteMany({
      where: { asset_id: { in: created.assetIds } },
    });
    await prisma.borrow_histories.deleteMany({
      where: { borrow_request_detail_id: { in: created.detailIds } },
    });
    await prisma.borrow_request_details.deleteMany({
      where: { id: { in: created.detailIds } },
    });
    await prisma.borrow_requests.deleteMany({
      where: { id: { in: created.requestIds } },
    });
    await prisma.assets.deleteMany({ where: { id: { in: created.assetIds } } });
    await prisma.users.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.asset_models.deleteMany({ where: { id: { in: created.modelIds } } });
    await prisma.brands.deleteMany({ where: { id: { in: created.brandIds } } });
    await prisma.asset_types.deleteMany({ where: { id: { in: created.typeIds } } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const type = await prisma.asset_types.create({ data: { name: `Asset API Type ${suffix}` } });
  created.typeIds.push(type.id);
  const brand = await prisma.brands.create({ data: { name: `Asset API Brand ${suffix}` } });
  created.brandIds.push(brand.id);
  const model = await prisma.asset_models.create({
    data: { asset_type_id: type.id, brand_id: brand.id, name: `Asset API Model ${suffix}` },
  });
  created.modelIds.push(model.id);

  const createAsset = async (
    serial: string,
    status: 'available' | 'reserved' | 'borrowed' | 'damaged' | 'in_repair' | 'retired' = 'available',
  ) => {
    const asset = await prisma.assets.create({
      data: {
        asset_model_id: model.id,
        department_id: department.id,
        serial_number: serial,
        qr_code: crypto.randomUUID(),
        image_url: 'https://example.test/asset.png',
        status,
      },
    });
    created.assetIds.push(asset.id);
    return asset;
  };

  const oldestAvailable = await createAsset(`API-OLD-${suffix}`);
  const newestAvailable = await createAsset(`API-NEW-${suffix}`);
  const damagedAsset = await createAsset(`API-DMG-${suffix}`, 'damaged');
  const borrowedAsset = await createAsset(`API-BOR-${suffix}`, 'borrowed');

  const createUser = async (offset: number) => {
    const user = await prisma.users.create({
      data: {
        department_id: department.id,
        name: `Asset API User ${offset}`,
        email: `asset${offset}.${suffix}@test.local`,
        phone: `${String(800 + offset).padStart(3, '0')}${suffix}`,
        password: 'not-used-by-token-test',
      },
    });
    created.userIds.push(user.id);
    return user;
  };
  const borrower = await createUser(1);
  const permissionReporter = await createUser(2);
  const forbiddenReporter = await createUser(3);

  const borrowRequest = await prisma.borrow_requests.create({
    data: { user_id: borrower.id, note: 'Current borrower fixture' },
  });
  created.requestIds.push(borrowRequest.id);
  const borrowDetail = await prisma.borrow_request_details.create({
    data: {
      borrow_request_id: borrowRequest.id,
      asset_id: borrowedAsset.id,
      expected_return_date: new Date('2026-12-31T00:00:00Z'),
    },
  });
  created.detailIds.push(borrowDetail.id);
  await prisma.borrow_histories.create({
    data: { borrow_request_detail_id: borrowDetail.id },
  });

  const assetViewToken = tokenService.createAccessToken(borrower.id, ['asset.view']);
  const assetManagerToken = tokenService.createAccessToken(permissionReporter.id, [
    'asset.view',
    'asset.create',
    'asset.update',
    'asset.delete',
    'brand.view',
    'brand.create',
    'brand.update',
    'asset_type.view',
    'asset_type.create',
    'asset_type.update',
    'asset_model.view',
    'asset_model.create',
    'asset_model.update',
  ]);
  const noAssetViewToken = tokenService.createAccessToken(borrower.id, []);
  const issuePermissionToken = tokenService.createAccessToken(permissionReporter.id, [
    'asset_issue.report',
  ]);
  const forbiddenToken = tokenService.createAccessToken(forbiddenReporter.id, []);

  const paged = await request(
    `/assets?status=available&q=api&page=1&pageSize=1`,
    assetViewToken,
  );
  assert.equal(paged.status, 200);
  assert.equal(paged.body.data.page, 1);
  assert.equal(paged.body.data.pageSize, 1);
  assert.equal(paged.body.data.total, 2);
  assert.equal(paged.body.data.items[0].id, newestAvailable.id);
  assert.equal(paged.body.data.items[0].status, 'AVAILABLE');
  assert.deepEqual(paged.body.data.items[0].model, { id: model.id, name: model.name });

  const queryByModel = await request(`/assets?q=${encodeURIComponent(model.name)}`, assetViewToken);
  assert.equal(queryByModel.status, 200);
  assert.ok(queryByModel.body.data.items.some((item: { id: number }) => item.id === damagedAsset.id));
  assert.equal((await request('/assets?page=0', assetViewToken)).status, 400);
  assert.equal((await request('/assets?status=unknown', assetViewToken)).status, 400);
  assert.equal((await request('/assets', noAssetViewToken)).status, 403);

  const detail = await request(`/assets/${borrowedAsset.id}`, assetViewToken);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.status, 'BORROWED');
  assert.deepEqual(detail.body.data.brand, { id: brand.id, name: brand.name });
  assert.deepEqual(detail.body.data.type, { id: type.id, name: type.name });
  assert.deepEqual(detail.body.data.department, { id: department.id, name: (await prisma.departments.findUniqueOrThrow({ where: { id: department.id } })).name });
  assert.equal(detail.body.data.actions.canReportIssue, true);
  assert.equal((await request('/assets/999999', assetViewToken)).status, 404);

  const borrowerReport = await request(`/assets/${borrowedAsset.id}/report-damaged`, assetViewToken, {
    method: 'POST',
    body: JSON.stringify({ description: '  Battery will not charge.  ' }),
  });
  assert.equal(borrowerReport.status, 201);
  assert.equal(borrowerReport.body.data.status, 'REPORTED');
  assert.equal(borrowerReport.body.data.description, 'Battery will not charge.');
  assert.equal(borrowerReport.body.data.reportedBy, borrower.id);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: borrowedAsset.id } })).status, 'borrowed');

  const permissionReport = await request(`/assets/${newestAvailable.id}/report-damaged`, issuePermissionToken, {
    method: 'POST',
    body: JSON.stringify({ description: 'Screen flickers intermittently.' }),
  });
  assert.equal(permissionReport.status, 201);
  assert.equal((await prisma.asset_issues.count({ where: { asset_id: newestAvailable.id, status: 'REPORTED' } })), 1);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: newestAvailable.id } })).status, 'available');

  assert.equal(
    (await request(`/assets/${oldestAvailable.id}/report-damaged`, forbiddenToken, {
      method: 'POST',
      body: JSON.stringify({ description: 'Not my asset.' }),
    })).status,
    403,
  );
  assert.equal(
    (await request(`/assets/${oldestAvailable.id}/report-damaged`, forbiddenToken, {
      method: 'POST',
      body: JSON.stringify({ description: '   ' }),
    })).status,
    400,
  );
  assert.equal(
    (await request('/assets/999999/report-damaged', issuePermissionToken, {
      method: 'POST',
      body: JSON.stringify({ description: 'Missing asset.' }),
    })).status,
    404,
  );

  // US-F02-06: catalog list/create/update without delete routes.
  const apiBrand = await request('/brands', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ name: `API Managed Brand ${suffix}` }),
  });
  assert.equal(apiBrand.status, 201);
  created.brandIds.push(apiBrand.body.data.id);
  assert.deepEqual(apiBrand.body.data, {
    id: apiBrand.body.data.id,
    name: `API Managed Brand ${suffix}`,
  });
  assert.equal((await request('/brands', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ name: `API Managed Brand ${suffix}` }),
  })).status, 409);

  const apiType = await request('/asset-types', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ name: `API Managed Type ${suffix}` }),
  });
  assert.equal(apiType.status, 201);
  created.typeIds.push(apiType.body.data.id);

  const apiModel = await request('/asset-models', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({
      brandId: apiBrand.body.data.id,
      assetTypeId: apiType.body.data.id,
      name: `API Managed Model ${suffix}`,
    }),
  });
  assert.equal(apiModel.status, 201);
  created.modelIds.push(apiModel.body.data.id);
  assert.equal(apiModel.body.data.brandId, apiBrand.body.data.id);
  assert.equal(apiModel.body.data.assetTypeId, apiType.body.data.id);
  assert.equal((await request('/asset-models', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ brandId: 999999, assetTypeId: apiType.body.data.id, name: 'Invalid ref' }),
  })).status, 409);
  const renamedBrand = await request(`/brands/${apiBrand.body.data.id}`, assetManagerToken, {
    method: 'PATCH',
    body: JSON.stringify({ name: `API Renamed Brand ${suffix}` }),
  });
  assert.equal(renamedBrand.status, 200);
  assert.equal(renamedBrand.body.data.name, `API Renamed Brand ${suffix}`);
  assert.ok((await request('/asset-models', assetManagerToken)).body.data.some(
    (item: { id: number; brandId: number }) => item.id === apiModel.body.data.id && item.brandId === apiBrand.body.data.id,
  ));
  assert.equal((await request(`/brands/${apiBrand.body.data.id}`, assetManagerToken, { method: 'DELETE' })).status, 404);
  assert.equal((await request(`/asset-types/${apiType.body.data.id}`, assetManagerToken, { method: 'DELETE' })).status, 404);
  assert.equal((await request(`/asset-models/${apiModel.body.data.id}`, assetManagerToken, { method: 'DELETE' })).status, 404);

  // US-F02-04: server-generated QR, forced AVAILABLE and nullable fields.
  const createdByApi = await request('/assets', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({
      assetModelId: apiModel.body.data.id,
      serialNumber: `API-CREATE-${suffix}`,
      imageUrl: 'https://example.test/created-asset.png',
      departmentId: department.id,
    }),
  });
  assert.equal(createdByApi.status, 201);
  created.assetIds.push(createdByApi.body.data.id);
  assert.equal(createdByApi.body.data.status, 'AVAILABLE');
  assert.match(createdByApi.body.data.qrCode, /^[0-9a-f-]{36}$/i);
  assert.equal(createdByApi.body.data.departmentId, department.id);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: createdByApi.body.data.id } })).status, 'available');
  assert.equal((await request('/assets', forbiddenToken, {
    method: 'POST',
    body: JSON.stringify({ assetModelId: apiModel.body.data.id }),
  })).status, 403);
  assert.equal((await request('/assets', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ assetModelId: apiModel.body.data.id, status: 'DAMAGED' }),
  })).status, 400);
  assert.equal((await request('/assets', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ assetModelId: apiModel.body.data.id, serialNumber: `API-CREATE-${suffix}` }),
  })).status, 409);
  assert.equal((await request('/assets', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ assetModelId: 999999 }),
  })).status, 409);
  assert.equal((await request('/assets', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ assetModelId: apiModel.body.data.id, departmentId: 999999 }),
  })).status, 409);

  const nullableAsset = await request('/assets', assetManagerToken, {
    method: 'POST',
    body: JSON.stringify({ assetModelId: apiModel.body.data.id, serialNumber: null, imageUrl: null, departmentId: null }),
  });
  assert.equal(nullableAsset.status, 201);
  created.assetIds.push(nullableAsset.body.data.id);
  assert.equal(nullableAsset.body.data.serialNumber, null);
  assert.equal(nullableAsset.body.data.imageUrl, null);
  assert.equal(nullableAsset.body.data.departmentId, null);

  // US-F02-05: editable fields only and null clearing.
  const updatedByApi = await request(`/assets/${createdByApi.body.data.id}`, assetManagerToken, {
    method: 'PATCH',
    body: JSON.stringify({
      serialNumber: `API-UPDATED-${suffix}`,
      imageUrl: null,
      departmentId: null,
    }),
  });
  assert.equal(updatedByApi.status, 200);
  assert.equal(updatedByApi.body.data.serialNumber, `API-UPDATED-${suffix}`);
  assert.equal(updatedByApi.body.data.imageUrl, null);
  assert.equal(updatedByApi.body.data.departmentId, null);
  assert.equal((await request(`/assets/${createdByApi.body.data.id}`, assetManagerToken, {
    method: 'PATCH',
    body: JSON.stringify({ qrCode: crypto.randomUUID() }),
  })).status, 400);
  assert.equal((await request(`/assets/${createdByApi.body.data.id}`, assetManagerToken, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'DAMAGED' }),
  })).status, 400);
  assert.equal((await request('/assets/999999', assetManagerToken, {
    method: 'PATCH',
    body: JSON.stringify({ serialNumber: 'NOT-FOUND' }),
  })).status, 404);

  // US-F02-08: QR lookup is read-only and permission protected.
  const beforeLookup = await prisma.assets.findUniqueOrThrow({ where: { id: createdByApi.body.data.id } });
  const qrLookup = await request(`/assets/by-qr/${encodeURIComponent(beforeLookup.qr_code)}`, assetManagerToken);
  assert.equal(qrLookup.status, 200);
  assert.equal(qrLookup.body.data.id, createdByApi.body.data.id);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: createdByApi.body.data.id } })).status, beforeLookup.status);
  assert.equal((await request(`/assets/by-qr/${encodeURIComponent(beforeLookup.qr_code)}`, forbiddenToken)).status, 403);
  assert.equal((await request('/assets/by-qr/not-a-real-qr', assetManagerToken)).status, 404);

  // US-F02-07: dedicated retire action and every source-state rule.
  const retireFixtures = await Promise.all(
    (['available', 'damaged', 'in_repair', 'reserved', 'borrowed', 'retired'] as const).map((status) => createAsset(`RET-${status}-${suffix}`, status)),
  );
  for (const fixture of retireFixtures.slice(0, 3)) {
    assert.equal((await request(`/assets/${fixture.id}/retire`, assetManagerToken, { method: 'POST' })).status, 204);
    assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: fixture.id } })).status, 'retired');
  }
  for (const fixture of retireFixtures.slice(3)) {
    assert.equal((await request(`/assets/${fixture.id}/retire`, assetManagerToken, { method: 'POST' })).status, 409);
    assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: fixture.id } })).status, fixture.status);
  }
  assert.equal((await request(`/assets/${createdByApi.body.data.id}/retire`, forbiddenToken, { method: 'POST' })).status, 403);
  assert.equal((await request('/assets/999999/retire', assetManagerToken, { method: 'POST' })).status, 404);
  assert.equal((await request(`/assets/${createdByApi.body.data.id}`, assetManagerToken, { method: 'DELETE' })).status, 404);
});
