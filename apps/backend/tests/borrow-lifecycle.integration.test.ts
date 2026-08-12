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
  const created = { assets: [] as number[], users: [] as number[], requests: [] as number[], details: [] as number[], histories: [] as number[], issueIds: [] as number[], models: [] as number[], brands: [] as number[], types: [] as number[] };
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
    await prisma.notifications.deleteMany({
      where: {
        OR: [
          { recipient_user_id: { in: created.users } },
          { related_entity_type: 'BORROW_REQUEST', related_entity_id: { in: created.requests } },
          { related_entity_type: 'ASSET_ISSUE', related_entity_id: { in: created.issueIds } },
        ],
      },
    });
    await prisma.asset_issues.deleteMany({ where: { id: { in: created.issueIds } } });
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
  const damagedReturnAsset = await createAsset(`BOR-DAMAGED-RETURN-${suffix}`);

  const createUser = async (name: string, sequence: number) => {
    const user = await prisma.users.create({ data: { user_code: `BI26${suffix}${sequence}`, department_id: department.id, name, email: `borrow.${sequence}.${suffix}@test.local`, phone: `${String(700 + sequence).padStart(3, '0')}${suffix}`, password: 'not-used-by-token-test' } });
    created.users.push(user.id);
    return user;
  };
  const borrower = await createUser('Borrower', 1);
  const operator = await createUser('Operator', 2);
  const borrowerToken = tokenService.createAccessToken(borrower.id, ['borrow_request.create', 'borrow_request.view_own', 'borrow_request.cancel_own', 'borrow_history.view_own']);
  const reviewerToken = tokenService.createAccessToken(operator.id, ['borrow_request.view_all', 'borrow_request.approve', 'borrow_request.reject', 'asset.checkout', 'asset.checkin', 'borrow_history.view_all']);
  const operatorOwnHistoryToken = tokenService.createAccessToken(operator.id, ['borrow_history.view_own']);
  const noPermissionToken = tokenService.createAccessToken(operator.id, []);
  const noteAtLimit = 'n'.repeat(300);
  const noteTooLong = 'n'.repeat(301);
  const descriptionAtLimit = 'd'.repeat(1000);
  const descriptionTooLong = 'd'.repeat(1001);

  const invalidDate = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'Invalid date validation', items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01T00:00:00.000Z' }] }),
  });
  assert.equal(invalidDate.status, 400);

  const duplicateAsset = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'Duplicate asset validation', items: [
      { assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' },
      { assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-02' },
    ] }),
  });
  assert.equal(duplicateAsset.status, 409);
  const missingPurpose = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' }] }),
  });
  assert.equal(missingPurpose.status, 400);
  const blankPurpose = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: '   ', items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' }] }),
  });
  assert.equal(blankPurpose.status, 400);
  assert.equal((await request('/borrow-requests', noPermissionToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'Permission validation', items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' }] }),
  })).status, 403);

  const acceptedNoteLimit = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: noteAtLimit, items: [{ assetId: cancelAsset.id, expectedReturnDate: '2099-01-01' }] }),
  });
  assert.equal(acceptedNoteLimit.status, 201, JSON.stringify(acceptedNoteLimit.body));
  const acceptedNoteLimitRequestId = acceptedNoteLimit.body.data.id as number;
  const acceptedNoteLimitDetailId = acceptedNoteLimit.body.data.details[0].id as number;
  created.requests.push(acceptedNoteLimitRequestId);
  created.details.push(acceptedNoteLimitDetailId);
  assert.equal((await request(`/borrow-requests/${acceptedNoteLimitRequestId}/cancel`, borrowerToken, { method: 'POST' })).status, 200);
  const rejectedNoteTooLong = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: noteTooLong, items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' }] }),
  });
  assert.equal(rejectedNoteTooLong.status, 400, JSON.stringify(rejectedNoteTooLong.body));

  const createLifecycle = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'Integration test borrowing reason', items: [{ assetId: lifecycleAsset.id, expectedReturnDate: '2099-01-01' }] }),
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
  const approvedQueue = await request('/borrow-request-details/review-queue?approvalStatus=APPROVED', reviewerToken);
  assert.equal(approvedQueue.status, 200, JSON.stringify(approvedQueue.body));
  assert.ok(approvedQueue.body.data.items.some((item: { id: number }) => item.id === lifecycleRequestId));
  const approvedDetail = await request(`/borrow-request-details/review-queue/${lifecycleRequestId}`, reviewerToken);
  assert.equal(approvedDetail.status, 200, JSON.stringify(approvedDetail.body));
  assert.equal(approvedDetail.body.data.details[0].approvalStatus, 'APPROVED');
  assert.equal((await request(`/borrow-request-details/review-queue/${lifecycleRequestId}`, noPermissionToken)).status, 403);
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
  const ownHistoryDetail = await request(`/borrow-histories/${historyId}`, borrowerToken);
  assert.equal(ownHistoryDetail.status, 200, JSON.stringify(ownHistoryDetail.body));
  assert.equal(ownHistoryDetail.body.data.request.id, lifecycleRequestId);
  assert.equal(ownHistoryDetail.body.data.request.note, 'Integration test borrowing reason');
  assert.equal(ownHistoryDetail.body.data.approvalStatus, 'APPROVED');
  assert.equal(ownHistoryDetail.body.data.approvedBy.id, operator.id);
  assert.equal(ownHistoryDetail.body.data.handedOverBy.id, operator.id);
  assert.equal(ownHistoryDetail.body.data.returnedAt, null);
  const reviewerHistoryDetail = await request(`/borrow-histories/${historyId}`, reviewerToken);
  assert.equal(reviewerHistoryDetail.status, 200, JSON.stringify(reviewerHistoryDetail.body));
  assert.equal(reviewerHistoryDetail.body.data.request.requester.id, borrower.id);
  assert.equal((await request(`/borrow-histories/${historyId}`, operatorOwnHistoryToken)).status, 404);
  assert.equal((await request(`/borrow-histories/${historyId}`, noPermissionToken)).status, 403);
  const currentTab = await request('/borrow-histories/me?state=CURRENT', borrowerToken);
  assert.equal(currentTab.status, 200, JSON.stringify(currentTab.body));
  assert.ok(currentTab.body.data.items.some((item: { id: number; returnedAt: null }) => item.id === historyId && item.returnedAt === null));
  const returnedTabBeforeReturn = await request('/borrow-histories/me?state=RETURNED', borrowerToken);
  assert.equal(returnedTabBeforeReturn.status, 200, JSON.stringify(returnedTabBeforeReturn.body));
  assert.ok(!returnedTabBeforeReturn.body.data.items.some((item: { id: number }) => item.id === historyId));

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
  const returnedTab = await request('/borrow-histories/me?state=RETURNED', borrowerToken);
  assert.equal(returnedTab.status, 200, JSON.stringify(returnedTab.body));
  assert.ok(returnedTab.body.data.items.some((item: { id: number; returnedAt: string | null }) => item.id === historyId && item.returnedAt));
  const returnedHistoryDetail = await request(`/borrow-histories/${historyId}`, borrowerToken);
  assert.equal(returnedHistoryDetail.status, 200, JSON.stringify(returnedHistoryDetail.body));
  assert.equal(returnedHistoryDetail.body.data.receivedBy.id, operator.id);
  assert.equal(returnedHistoryDetail.body.data.returnCondition, 'NORMAL');
  const currentTabAfterReturn = await request('/borrow-histories/me?state=CURRENT', borrowerToken);
  assert.ok(!currentTabAfterReturn.body.data.items.some((item: { id: number }) => item.id === historyId));
  const allHistory = await request('/borrow-histories?page=1&pageSize=20', reviewerToken);
  assert.equal(allHistory.status, 200);
  assert.ok(Array.isArray(allHistory.body.data.items));
  assert.equal((await request('/borrow-histories', borrowerToken)).status, 403);
  assert.equal((await request(`/borrow-histories/${historyId}/return`, reviewerToken, { method: 'POST' })).status, 409);

  const damagedRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'Damaged return integration test', items: [{ assetId: damagedReturnAsset.id, expectedReturnDate: '2099-03-01' }] }),
  });
  assert.equal(damagedRequest.status, 201, JSON.stringify(damagedRequest.body));
  const damagedRequestId = damagedRequest.body.data.id as number;
  const damagedDetailId = damagedRequest.body.data.details[0].id as number;
  created.requests.push(damagedRequestId);
  created.details.push(damagedDetailId);
  assert.equal((await request(`/borrow-request-details/${damagedDetailId}/approve`, reviewerToken, { method: 'POST' })).status, 200);
  const damagedHandover = await request(`/borrow-request-details/${damagedDetailId}/handover`, reviewerToken, { method: 'POST' });
  assert.equal(damagedHandover.status, 200, JSON.stringify(damagedHandover.body));
  const damagedHistoryId = damagedHandover.body.data.historyId as number;
  created.histories.push(damagedHistoryId);
  const missingDescription = await request(`/borrow-histories/${damagedHistoryId}/return-damaged`, reviewerToken, {
    method: 'POST',
    body: JSON.stringify({ description: '   ' }),
  });
  assert.equal(missingDescription.status, 400);
  const rejectedDescriptionTooLong = await request(`/borrow-histories/${damagedHistoryId}/return-damaged`, reviewerToken, {
    method: 'POST',
    body: JSON.stringify({ description: descriptionTooLong }),
  });
  assert.equal(rejectedDescriptionTooLong.status, 400, JSON.stringify(rejectedDescriptionTooLong.body));
  const damagedReturn = await request(`/borrow-histories/${damagedHistoryId}/return-damaged`, reviewerToken, {
    method: 'POST',
    body: JSON.stringify({ description: descriptionAtLimit }),
  });
  assert.equal(damagedReturn.status, 200, JSON.stringify(damagedReturn.body));
  const damagedIssueId = damagedReturn.body.data.issueId as number;
  assert.equal(typeof damagedIssueId, 'number');
  assert.deepEqual(Object.keys(damagedReturn.body.data).sort(), ['historyId', 'issueId', 'returnCondition', 'returned'].sort());
  assert.equal(damagedReturn.body.data.historyId, damagedHistoryId);
  assert.equal(damagedReturn.body.data.returned, true);
  assert.equal(damagedReturn.body.data.returnCondition, 'DAMAGED');
  created.issueIds.push(damagedIssueId);
  assert.equal((await prisma.borrow_histories.findUniqueOrThrow({ where: { id: damagedHistoryId } })).return_condition, 'DAMAGED');
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: damagedReturnAsset.id } })).status, 'damaged');
  const damagedIssue = await prisma.asset_issues.findUniqueOrThrow({ where: { id: damagedIssueId } });
  assert.equal(damagedIssue.description.length, 1000);
  assert.equal(damagedIssue.status, 'CONFIRMED');
  assert.equal(damagedIssue.reported_by, operator.id);
  assert.equal(damagedIssue.handled_by, operator.id);
  assert.equal((await request(`/borrow-histories/${damagedHistoryId}/return-damaged`, reviewerToken, {
    method: 'POST',
    body: JSON.stringify({ description: 'Duplicate return attempt.' }),
  })).status, 409);

  const rejectRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({
      note: 'Reject integration test request',
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
    { method: 'POST', body: JSON.stringify({ rejectionReason: noteTooLong }) },
  );
  assert.equal(rejected.status, 400, JSON.stringify(rejected.body));
  const rejectedWithLimitReason = await request(
    `/borrow-request-details/${rejectDetailId}/reject`,
    reviewerToken,
    { method: 'POST', body: JSON.stringify({ rejectionReason: noteAtLimit }) },
  );
  assert.equal(rejectedWithLimitReason.status, 200, JSON.stringify(rejectedWithLimitReason.body));
  const rejectedQueue = await request('/borrow-request-details/review-queue?approvalStatus=REJECTED', reviewerToken);
  assert.equal(rejectedQueue.status, 200, JSON.stringify(rejectedQueue.body));
  assert.ok(rejectedQueue.body.data.items.some((item: { id: number }) => item.id === rejectRequestId));
  assert.equal(
    (await prisma.borrow_requests.findUniqueOrThrow({ where: { id: rejectRequestId } })).status,
    'rejected',
  );

  const bulkRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'Bulk approval integration test', items: [
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
    body: JSON.stringify({ note: 'Competing reservation integration test', items: [
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

  const cancelRequest = await request('/borrow-requests', borrowerToken, { method: 'POST', body: JSON.stringify({ note: 'Cancellation integration test', items: [{ assetId: cancelAsset.id, expectedReturnDate: '2099-01-01' }] }) });
  assert.equal(cancelRequest.status, 201);
  const cancelRequestId = cancelRequest.body.data.id as number;
  const cancelDetailId = cancelRequest.body.data.details[0].id as number;
  created.requests.push(cancelRequestId); created.details.push(cancelDetailId);
  assert.equal((await request(`/borrow-requests/${cancelRequestId}/cancel`, borrowerToken, { method: 'POST' })).status, 200);
  assert.equal((await prisma.borrow_requests.findUniqueOrThrow({ where: { id: cancelRequestId } })).status, 'cancelled');
});
