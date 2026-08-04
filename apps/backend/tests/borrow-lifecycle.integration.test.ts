import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'node:http';

test('Borrow lifecycle APIs create, approve, hand over, return and cancel safely', async (context) => {
  const [{ default: app }, { default: prisma }, { TokenService }] = await Promise.all([
    import('../src/app.js'),
    import('../src/prisma.js'),
    import('../src/services/token.service.js'),
  ]);

  const department = await prisma.departments.findFirst({ select: { id: true } });
  assert.ok(department, 'A department seed is required');

  const suffix = `${Date.now()}`.slice(-7);
  const created = { assets: [] as number[], users: [] as number[], requests: [] as number[], details: [] as number[], histories: [] as number[], models: [] as number[], brands: [] as number[], types: [] as number[] };
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
    return { status: response.status, body: await response.json().catch(() => null) };
  };

  context.after(async () => {
    await prisma.borrow_histories.deleteMany({ where: { id: { in: created.histories } } });
    await prisma.borrow_request_details.deleteMany({ where: { id: { in: created.details } } });
    await prisma.borrow_requests.deleteMany({ where: { id: { in: created.requests } } });
    await prisma.assets.deleteMany({ where: { id: { in: created.assets } } });
    await prisma.users.deleteMany({ where: { id: { in: created.users } } });
    await prisma.asset_models.deleteMany({ where: { id: { in: created.models } } });
    await prisma.brands.deleteMany({ where: { id: { in: created.brands } } });
    await prisma.asset_types.deleteMany({ where: { id: { in: created.types } } });
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const type = await prisma.asset_types.create({ data: { name: `Borrow Type ${suffix}` } });
  const brand = await prisma.brands.create({ data: { name: `Borrow Brand ${suffix}` } });
  const model = await prisma.asset_models.create({ data: { asset_type_id: type.id, brand_id: brand.id, name: `Borrow Model ${suffix}` } });
  created.types.push(type.id); created.brands.push(brand.id); created.models.push(model.id);

  const createAsset = async (serial: string) => {
    const asset = await prisma.assets.create({ data: { asset_model_id: model.id, department_id: department.id, serial_number: serial, qr_code: crypto.randomUUID() } });
    created.assets.push(asset.id);
    return asset;
  };
  const lifecycleAsset = await createAsset(`BOR-LIFE-${suffix}`);
  const rejectAsset = await createAsset(`BOR-REJECT-${suffix}`);
  const cancelAsset = await createAsset(`BOR-CANCEL-${suffix}`);
  const bulkAvailableAsset = await createAsset(`BOR-BULK-OK-${suffix}`);
  const bulkConflictAsset = await createAsset(`BOR-BULK-CONFLICT-${suffix}`);

  const createUser = async (name: string, sequence: number) => {
    const user = await prisma.users.create({ data: { department_id: department.id, name, email: `borrow.${sequence}.${suffix}@test.local`, phone: `${String(700 + sequence).padStart(3, '0')}${suffix}`, password: 'not-used-by-token-test' } });
    created.users.push(user.id);
    return user;
  };
  const borrower = await createUser('Borrower', 1);
  const operator = await createUser('Operator', 2);
  const borrowerToken = tokenService.createAccessToken(borrower.id, ['borrow_request.create', 'borrow_request.view_own', 'borrow_request.cancel_own', 'borrow_history.view_own']);
  const reviewerToken = tokenService.createAccessToken(operator.id, ['borrow_request.view_all', 'borrow_request.approve', 'borrow_request.reject', 'asset.checkout', 'asset.checkin', 'borrow_history.view_all']);
  const noPermissionToken = tokenService.createAccessToken(operator.id, []);

  const invalidDate = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01T00:00:00.000Z' }] }),
  });
  assert.equal(invalidDate.status, 400);

  const duplicateAsset = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ items: [
      { assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' },
      { assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-02' },
    ] }),
  });
  assert.equal(duplicateAsset.status, 409);
  assert.equal((await request('/borrow-requests', noPermissionToken, {
    method: 'POST',
    body: JSON.stringify({ items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' }] }),
  })).status, 403);

  const createLifecycle = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' }] }),
  });
  assert.equal(createLifecycle.status, 201);
  const lifecycleRequestId = createLifecycle.body.data.id as number;
  const lifecycleDetailId = createLifecycle.body.data.details[0].id as number;
  created.requests.push(lifecycleRequestId); created.details.push(lifecycleDetailId);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: lifecycleAsset.id } })).status, 'available');

  assert.equal((await request('/borrow-requests/me', borrowerToken)).status, 200);
  const ownRequest = await request(`/borrow-requests/${lifecycleRequestId}`, borrowerToken);
  assert.equal(ownRequest.status, 200);
  assert.equal(ownRequest.body.data.details[0].expectedReturnDate, '2099-01-01');
  const reviewQueue = await request('/borrow-request-details/review-queue', reviewerToken);
  assert.equal(reviewQueue.status, 200, JSON.stringify(reviewQueue.body));
  assert.equal(reviewQueue.body.data.page, 1);
  assert.equal(reviewQueue.body.data.pageSize, 20);
  assert.ok(Array.isArray(reviewQueue.body.data.items));
  assert.equal((await request('/borrow-request-details/review-queue', noPermissionToken)).status, 403);
  const approved = await request(
    `/borrow-request-details/${lifecycleDetailId}/approve`,
    reviewerToken,
    { method: 'POST' },
  );
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: lifecycleAsset.id } })).status, 'reserved');
  assert.equal((await request(`/borrow-request-details/${lifecycleDetailId}/approve`, reviewerToken, { method: 'POST' })).status, 409);

  const handover = await request(`/borrow-request-details/${lifecycleDetailId}/handover`, reviewerToken, { method: 'POST' });
  assert.equal(handover.status, 200);
  const historyId = handover.body.data.historyId as number;
  created.histories.push(historyId);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: lifecycleAsset.id } })).status, 'borrowed');
  assert.equal((await request(`/borrow-request-details/${lifecycleDetailId}/handover`, reviewerToken, { method: 'POST' })).status, 409);
  const current = await request('/borrow-histories/current', borrowerToken);
  assert.equal(current.status, 200);
  assert.equal(current.body.data.items[0].expectedReturnDate, '2099-01-01');
  assert.equal(current.body.data.items[0].borrower.id, borrower.id);

  const arbitraryCondition = await request(`/borrow-histories/${historyId}/return`, reviewerToken, {
    method: 'POST',
    body: JSON.stringify({ returnCondition: 'GOOD' }),
  });
  assert.equal(arbitraryCondition.status, 400);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: lifecycleAsset.id } })).status, 'borrowed');

  assert.equal((await request(`/borrow-histories/${historyId}/return`, reviewerToken, { method: 'POST' })).status, 200);
  assert.equal((await prisma.borrow_histories.findUniqueOrThrow({ where: { id: historyId } })).return_condition, 'NORMAL');
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: lifecycleAsset.id } })).status, 'available');
  assert.equal((await request('/borrow-histories/me', borrowerToken)).status, 200);
  const allHistory = await request('/borrow-histories?page=1&pageSize=20', reviewerToken);
  assert.equal(allHistory.status, 200);
  assert.ok(Array.isArray(allHistory.body.data.items));
  assert.equal((await request('/borrow-histories', borrowerToken)).status, 403);
  assert.equal((await request(`/borrow-histories/${historyId}/return`, reviewerToken, { method: 'POST' })).status, 409);

  const rejectRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({
      items: [{ assetId: rejectAsset.id, expectedReturnDate: '2099-01-01' }],
    }),
  });
  assert.equal(rejectRequest.status, 201);
  const rejectRequestId = rejectRequest.body.data.id as number;
  const rejectDetailId = rejectRequest.body.data.details[0].id as number;
  created.requests.push(rejectRequestId);
  created.details.push(rejectDetailId);
  const rejected = await request(
    `/borrow-request-details/${rejectDetailId}/reject`,
    reviewerToken,
    { method: 'POST', body: JSON.stringify({ rejectionReason: 'Not available for this purpose' }) },
  );
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
  assert.equal(
    (await prisma.borrow_requests.findUniqueOrThrow({ where: { id: rejectRequestId } })).status,
    'rejected',
  );

  const bulkRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ items: [
      { assetId: bulkAvailableAsset.id, expectedReturnDate: '2099-02-01' },
      { assetId: bulkConflictAsset.id, expectedReturnDate: '2099-02-01' },
    ] }),
  });
  assert.equal(bulkRequest.status, 201, JSON.stringify(bulkRequest.body));
  const bulkRequestId = bulkRequest.body.data.id as number;
  const bulkOkDetailId = bulkRequest.body.data.details[0].id as number;
  const bulkConflictDetailId = bulkRequest.body.data.details[1].id as number;
  created.requests.push(bulkRequestId);
  created.details.push(bulkOkDetailId, bulkConflictDetailId);

  const competingRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ items: [
      { assetId: bulkConflictAsset.id, expectedReturnDate: '2099-02-02' },
    ] }),
  });
  assert.equal(competingRequest.status, 201, JSON.stringify(competingRequest.body));
  const competingRequestId = competingRequest.body.data.id as number;
  const competingDetailId = competingRequest.body.data.details[0].id as number;
  created.requests.push(competingRequestId);
  created.details.push(competingDetailId);
  assert.equal((await request(
    `/borrow-request-details/${competingDetailId}/approve`,
    reviewerToken,
    { method: 'POST' },
  )).status, 200);

  assert.equal((await request(
    `/borrow-requests/${bulkRequestId}/approve-all`,
    noPermissionToken,
    { method: 'POST' },
  )).status, 403);
  const approveAll = await request(
    `/borrow-requests/${bulkRequestId}/approve-all`,
    reviewerToken,
    { method: 'POST' },
  );
  assert.equal(approveAll.status, 200, JSON.stringify(approveAll.body));
  assert.deepEqual(approveAll.body.data.approved, [
    { detailId: bulkOkDetailId, approvalStatus: 'APPROVED' },
  ]);
  assert.deepEqual(approveAll.body.data.skipped, [
    {
      detailId: bulkConflictDetailId,
      approvalStatus: 'PENDING',
      reason: 'ASSET_NOT_AVAILABLE',
    },
  ]);
  assert.equal(
    (await prisma.borrow_request_details.findUniqueOrThrow({ where: { id: bulkOkDetailId } })).approval_status,
    'APPROVED',
  );
  assert.equal(
    (await prisma.borrow_request_details.findUniqueOrThrow({ where: { id: bulkConflictDetailId } })).approval_status,
    'PENDING',
  );
  assert.equal(
    (await prisma.borrow_requests.findUniqueOrThrow({ where: { id: bulkRequestId } })).status,
    'partially_approved',
  );
  assert.equal(
    (await prisma.assets.findUniqueOrThrow({ where: { id: bulkAvailableAsset.id } })).status,
    'reserved',
  );

  const cancelRequest = await request('/borrow-requests', borrowerToken, { method: 'POST', body: JSON.stringify({ items: [{ assetId: cancelAsset.id, expectedReturnDate: '2099-01-01' }] }) });
  assert.equal(cancelRequest.status, 201);
  const cancelRequestId = cancelRequest.body.data.id as number;
  const cancelDetailId = cancelRequest.body.data.details[0].id as number;
  created.requests.push(cancelRequestId); created.details.push(cancelDetailId);
  assert.equal((await request(`/borrow-requests/${cancelRequestId}/cancel`, borrowerToken, { method: 'POST' })).status, 200);
  assert.equal((await prisma.borrow_requests.findUniqueOrThrow({ where: { id: cancelRequestId } })).status, 'cancelled');
});
