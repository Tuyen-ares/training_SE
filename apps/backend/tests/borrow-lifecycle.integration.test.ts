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
    const outbox = await prisma.outbox_events.findMany({ where: { OR: [
      { aggregate_type: 'BORROW_REQUEST', aggregate_id: { in: created.requests } },
      { aggregate_type: 'BORROW_REQUEST_DETAIL', aggregate_id: { in: created.details } },
      { aggregate_type: 'BORROW_HISTORY', aggregate_id: { in: created.histories } },
      { aggregate_type: 'ASSET_ISSUE', aggregate_id: { in: created.issueIds } },
    ] }, select: { event_id: true } });
    await prisma.notification_deliveries.deleteMany({ where: { event_id: { in: outbox.map(row => row.event_id) } } });
    await prisma.notification_messages.deleteMany({ where: { event_id: { in: outbox.map(row => row.event_id) } } });
    await prisma.outbox_events.deleteMany({ where: { event_id: { in: outbox.map(row => row.event_id) } } });
    await prisma.notifications.deleteMany({
      where: {
        OR: [
          { recipient_user_id: { in: created.users } },
          { related_entity_type: 'BORROW_REQUEST', related_entity_id: { in: created.requests } },
          { related_entity_type: 'ASSET_ISSUE', related_entity_id: { in: created.issueIds } },
        ],
      },
    });
    await prisma.notification_deliveries.deleteMany({ where: { recipient_user_id: { in: created.users } } });
    await prisma.refresh_tokens.deleteMany({ where: { user_id: { in: created.users } } });
    await prisma.user_roles.deleteMany({ where: { user_id: { in: created.users } } });
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

  const type = await prisma.asset_types.create({
    data: { name: `Borrow Type ${suffix}`, normalized_prefix: `BOR${suffix}` },
  });
  const brand = await prisma.brands.create({ data: { name: `Borrow Brand ${suffix}` } });
  const model = await prisma.asset_models.create({ data: { asset_type_id: type.id, brand_id: brand.id, name: `Borrow Model ${suffix}` } });
  created.types.push(type.id); created.brands.push(brand.id); created.models.push(model.id);

  const createAsset = async (serial: string) => {
    const asset = await prisma.assets.create({ data: { asset_code: `${type.normalized_prefix}${String(created.assets.length + 1).padStart(4, '0')}`, asset_model_id: model.id, department_id: department.id, serial_number: serial, qr_code: crypto.randomUUID() } });
    created.assets.push(asset.id);
    return asset;
  };
  const lifecycleAsset = await createAsset(`BOR-LIFE-${suffix}`);
  const rejectAsset = await createAsset(`BOR-REJECT-${suffix}`);
  const cancelAsset = await createAsset(`BOR-CANCEL-${suffix}`);
  const bulkAvailableAsset = await createAsset(`BOR-BULK-OK-${suffix}`);
  const bulkConflictAsset = await createAsset(`BOR-BULK-CONFLICT-${suffix}`);
  const damagedReturnAsset = await createAsset(`BOR-DAMAGED-RETURN-${suffix}`);
  const queueSecondAsset = await createAsset(`BOR-QUEUE-SECOND-${suffix}`);
  const allPendingAsset = await createAsset(`BOR-ALL-PENDING-${suffix}`);
  const groupedAssetA = await createAsset(`BOR-GROUP-A-${suffix}`);
  const groupedAssetB = await createAsset(`BOR-GROUP-B-${suffix}`);

  const createUser = async (name: string, sequence: number) => {
    const user = await prisma.users.create({ data: { user_code: `BI26${suffix}${sequence}`, department_id: department.id, name, email: `borrow.${sequence}.${suffix}@test.local`, phone: `${String(700 + sequence).padStart(3, '0')}${suffix}`, password: 'not-used-by-token-test' } });
    created.users.push(user.id);
    return user;
  };
  const borrower = await createUser('Borrower', 1);
  const operator = await createUser('Operator', 2);
  const borrowerToken = tokenService.createAccessToken(borrower.id, ['borrow_request.create', 'borrow_request.view_own', 'borrow_request.cancel_own', 'borrow_history.view_own']);
  const reviewerToken = tokenService.createAccessToken(operator.id, ['borrow_request.view_all', 'borrow_request.approve', 'borrow_request.reject', 'asset.checkout', 'asset.checkin', 'borrow_history.view_all']);
  const checkoutOnlyToken = tokenService.createAccessToken(operator.id, ['asset.checkout']);
  const checkinOnlyToken = tokenService.createAccessToken(operator.id, ['asset.checkin']);
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
  const emptyHandoverQueue = await request('/borrow-request-details/handover-queue', checkoutOnlyToken);
  assert.equal(emptyHandoverQueue.status, 200, JSON.stringify(emptyHandoverQueue.body));
  assert.ok(!emptyHandoverQueue.body.data.items.some((item: { items?: Array<{ asset: { id: number } }> }) =>
    item.items?.some((detail) => detail.asset.id === lifecycleAsset.id)));
  assert.equal((await request('/borrow-request-details/handover-queue', checkinOnlyToken)).status, 403);
  const emptyReturnQueue = await request('/borrow-histories/return-queue', checkinOnlyToken);
  assert.equal(emptyReturnQueue.status, 200, JSON.stringify(emptyReturnQueue.body));
  assert.ok(!emptyReturnQueue.body.data.items.some((item: { items?: Array<{ asset: { id: number } }> }) =>
    item.items?.some((history) => history.asset.id === lifecycleAsset.id)));
  assert.equal((await request('/borrow-histories/return-queue', checkoutOnlyToken)).status, 403);
  const approved = await request(
    `/borrow-request-details/${lifecycleDetailId}/approve`,
    reviewerToken,
    { method: 'POST' },
  );
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: lifecycleAsset.id } })).status, 'reserved');
  const approvedQueue = await request('/borrow-request-details/review-queue?approvalStatus=APPROVED&page=1&pageSize=100', reviewerToken);
  assert.equal(approvedQueue.status, 200, JSON.stringify(approvedQueue.body));
  assert.ok(approvedQueue.body.data.items.some((item: { id: number }) => item.id === lifecycleRequestId));
  const approvedDetail = await request(`/borrow-request-details/review-queue/${lifecycleRequestId}`, reviewerToken);
  assert.equal(approvedDetail.status, 200, JSON.stringify(approvedDetail.body));
  assert.equal(approvedDetail.body.data.details[0].approvalStatus, 'APPROVED');
  assert.equal((await request(`/borrow-request-details/review-queue/${lifecycleRequestId}`, noPermissionToken)).status, 403);

  const queueSecondRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'Second handover queue item', items: [{ assetId: queueSecondAsset.id, expectedReturnDate: '2099-01-02' }] }),
  });
  assert.equal(queueSecondRequest.status, 201, JSON.stringify(queueSecondRequest.body));
  const queueSecondRequestId = queueSecondRequest.body.data.id as number;
  const queueSecondDetailId = queueSecondRequest.body.data.details[0].id as number;
  created.requests.push(queueSecondRequestId);
  created.details.push(queueSecondDetailId);
  assert.equal((await request(`/borrow-request-details/${queueSecondDetailId}/approve`, reviewerToken, { method: 'POST' })).status, 200);

  const allPendingRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'ALL filter pending-first integration test', items: [{ assetId: allPendingAsset.id, expectedReturnDate: '2099-01-05' }] }),
  });
  assert.equal(allPendingRequest.status, 201, JSON.stringify(allPendingRequest.body));
  const allPendingRequestId = allPendingRequest.body.data.id as number;
  const allPendingDetailId = allPendingRequest.body.data.details[0].id as number;
  created.requests.push(allPendingRequestId);
  created.details.push(allPendingDetailId);

  const allQueue = await request('/borrow-request-details/review-queue?approvalStatus=ALL&page=1&pageSize=100', reviewerToken);
  assert.equal(allQueue.status, 200, JSON.stringify(allQueue.body));
  assert.equal(allQueue.body.data.approvalStatus, 'ALL');
  const allQueueItems = allQueue.body.data.items as Array<{ id: number; details: Array<{ approvalStatus: string }> }>;
  const firstNonPendingIndex = allQueueItems.findIndex((item) =>
    !item.details.some((detail) => detail.approvalStatus === 'PENDING'));
  assert.ok(firstNonPendingIndex >= 0);
  assert.ok(allQueueItems
    .slice(0, firstNonPendingIndex)
    .every((item) => item.details.some((detail) => detail.approvalStatus === 'PENDING')));
  assert.ok(allQueueItems
    .slice(firstNonPendingIndex)
    .every((item) => !item.details.some((detail) => detail.approvalStatus === 'PENDING')));
  assert.ok(allQueueItems.some((item) => item.id === allPendingRequestId));
  assert.ok(allQueueItems.some((item) => item.id === queueSecondRequestId));

  const groupedRequest = await request('/borrow-requests', borrowerToken, {
    method: 'POST',
    body: JSON.stringify({ note: 'Multi-asset handover group', items: [
      { assetId: groupedAssetA.id, expectedReturnDate: '2099-01-03' },
      { assetId: groupedAssetB.id, expectedReturnDate: '2099-01-04' },
    ] }),
  });
  assert.equal(groupedRequest.status, 201, JSON.stringify(groupedRequest.body));
  const groupedRequestId = groupedRequest.body.data.id as number;
  const groupedDetailAId = groupedRequest.body.data.details[0].id as number;
  const groupedDetailBId = groupedRequest.body.data.details[1].id as number;
  created.requests.push(groupedRequestId);
  created.details.push(groupedDetailAId, groupedDetailBId);
  assert.equal((await request(`/borrow-request-details/${groupedDetailAId}/approve`, reviewerToken, { method: 'POST' })).status, 200);
  assert.equal((await request(`/borrow-request-details/${groupedDetailBId}/approve`, reviewerToken, { method: 'POST' })).status, 200);

  const handoverQueuePage = await request('/borrow-request-details/handover-queue?page=1&pageSize=1', checkoutOnlyToken);
  assert.equal(handoverQueuePage.status, 200, JSON.stringify(handoverQueuePage.body));
  assert.equal(handoverQueuePage.body.data.page, 1);
  assert.equal(handoverQueuePage.body.data.pageSize, 1);
  assert.ok(handoverQueuePage.body.data.items.length <= 1);
  const handoverQueueAll = await request('/borrow-request-details/handover-queue?page=1&pageSize=100', checkoutOnlyToken);
  assert.equal(handoverQueueAll.status, 200, JSON.stringify(handoverQueueAll.body));
  assert.equal(handoverQueueAll.body.data.page, 1);
  assert.equal(handoverQueueAll.body.data.pageSize, 100);
  const lifecycleQueueGroup = handoverQueueAll.body.data.items.find((item: { requestId: number }) => item.requestId === lifecycleRequestId);
  const secondQueueGroup = handoverQueueAll.body.data.items.find((item: { requestId: number }) => item.requestId === queueSecondRequestId);
  const groupedQueueGroup = handoverQueueAll.body.data.items.find((item: { requestId: number }) => item.requestId === groupedRequestId);
  assert.ok(lifecycleQueueGroup);
  assert.ok(secondQueueGroup);
  assert.ok(groupedQueueGroup);
  assert.equal(lifecycleQueueGroup.requester.id, borrower.id);
  assert.equal(lifecycleQueueGroup.pendingCount, 1);
  assert.equal(lifecycleQueueGroup.items[0].detailId, lifecycleDetailId);
  assert.equal(lifecycleQueueGroup.items[0].asset.status, 'RESERVED');
  assert.equal(lifecycleQueueGroup.items[0].approvedBy.id, operator.id);
  assert.equal(groupedQueueGroup.pendingCount, 2);
  assert.deepEqual(groupedQueueGroup.items.map((item: { detailId: number }) => item.detailId), [groupedDetailAId, groupedDetailBId]);
  assert.ok(handoverQueueAll.body.data.items.indexOf(lifecycleQueueGroup) < handoverQueueAll.body.data.items.indexOf(secondQueueGroup));
  const groupedHandoverDetail = await request(
    `/borrow-request-details/handover-queue/${groupedRequestId}`,
    checkoutOnlyToken,
  );
  assert.equal(groupedHandoverDetail.status, 200, JSON.stringify(groupedHandoverDetail.body));
  assert.equal(groupedHandoverDetail.body.data.requestId, groupedRequestId);
  assert.equal(groupedHandoverDetail.body.data.pendingCount, 2);
  assert.deepEqual(
    groupedHandoverDetail.body.data.items.map((item: { detailId: number }) => item.detailId),
    [groupedDetailAId, groupedDetailBId],
  );
  assert.equal(
    (await request(`/borrow-request-details/handover-queue/${groupedRequestId}`, noPermissionToken)).status,
    403,
  );
  assert.equal((await request(`/borrow-request-details/${lifecycleDetailId}/approve`, reviewerToken, { method: 'POST' })).status, 409);

  const handover = await request(`/borrow-request-details/${lifecycleDetailId}/handover`, reviewerToken, { method: 'POST' });
  assert.equal(handover.status, 200);
  const historyId = handover.body.data.historyId as number;
  created.histories.push(historyId);
  assert.equal((await prisma.assets.findUniqueOrThrow({ where: { id: lifecycleAsset.id } })).status, 'borrowed');
  const groupedHandoverA = await request(`/borrow-request-details/${groupedDetailAId}/handover`, checkoutOnlyToken, { method: 'POST' });
  assert.equal(groupedHandoverA.status, 200, JSON.stringify(groupedHandoverA.body));
  const groupedHistoryAId = groupedHandoverA.body.data.historyId as number;
  created.histories.push(groupedHistoryAId);
  const groupedHandoverB = await request(`/borrow-request-details/${groupedDetailBId}/handover`, checkoutOnlyToken, { method: 'POST' });
  assert.equal(groupedHandoverB.status, 200, JSON.stringify(groupedHandoverB.body));
  const groupedHistoryBId = groupedHandoverB.body.data.historyId as number;
  created.histories.push(groupedHistoryBId);
  const handoverQueueAfterHandover = await request('/borrow-request-details/handover-queue', checkoutOnlyToken);
  assert.equal(handoverQueueAfterHandover.status, 200, JSON.stringify(handoverQueueAfterHandover.body));
  assert.ok(!handoverQueueAfterHandover.body.data.items.some((item: { requestId: number }) => item.requestId === lifecycleRequestId));
  assert.ok(handoverQueueAfterHandover.body.data.items.some((item: { requestId: number; items: Array<{ detailId: number }> }) =>
    item.requestId === queueSecondRequestId && item.items.some((detail) => detail.detailId === queueSecondDetailId)));
  assert.ok(!handoverQueueAfterHandover.body.data.items.some((item: { requestId: number }) => item.requestId === groupedRequestId));
  assert.equal((await request(`/borrow-request-details/${lifecycleDetailId}/handover`, reviewerToken, { method: 'POST' })).status, 409);
  const secondHandover = await request(`/borrow-request-details/${queueSecondDetailId}/handover`, checkoutOnlyToken, { method: 'POST' });
  assert.equal(secondHandover.status, 200, JSON.stringify(secondHandover.body));
  const secondHistoryId = secondHandover.body.data.historyId as number;
  created.histories.push(secondHistoryId);
  const current = await request('/borrow-histories/current', borrowerToken);
  assert.equal(current.status, 200);
  assert.ok(current.body.data.items.some((item: { id: number; expectedReturnDate: string; borrower: { id: number } }) =>
    item.id === historyId && item.expectedReturnDate === '2099-01-01' && item.borrower.id === borrower.id));
  const currentActivity = await request('/borrow-histories/activity/me?state=CURRENT&page=1&pageSize=100', borrowerToken);
  assert.equal(currentActivity.status, 200, JSON.stringify(currentActivity.body));
  const groupedCurrentActivity = currentActivity.body.data.items.find((item: { requestId: number }) => item.requestId === groupedRequestId);
  assert.ok(groupedCurrentActivity);
  assert.equal(groupedCurrentActivity.itemCount, 2);
  assert.deepEqual(
    groupedCurrentActivity.items.map((item: { id: number }) => item.id),
    [groupedHistoryAId, groupedHistoryBId],
  );
  assert.equal(Object.hasOwn(groupedCurrentActivity, 'status'), false);
  const allCurrentActivity = await request('/borrow-histories/activity?state=CURRENT&page=1&pageSize=100', reviewerToken);
  assert.equal(allCurrentActivity.status, 200, JSON.stringify(allCurrentActivity.body));
  assert.ok(allCurrentActivity.body.data.items.some((item: { requestId: number }) => item.requestId === groupedRequestId));
  assert.equal((await request('/borrow-histories/activity', borrowerToken)).status, 403);
  assert.equal((await request('/borrow-histories/activity/me?state=CURRENT', operatorOwnHistoryToken)).status, 200);
  const ownHistoryDetail = await request(`/borrow-histories/${historyId}`, borrowerToken);
  assert.equal(ownHistoryDetail.status, 200, JSON.stringify(ownHistoryDetail.body));
  assert.equal(ownHistoryDetail.body.data.request.id, lifecycleRequestId);
  assert.equal(ownHistoryDetail.body.data.request.note, 'Integration test borrowing reason');
  assert.equal(ownHistoryDetail.body.data.approvalStatus, 'APPROVED');
  assert.equal(ownHistoryDetail.body.data.approvedBy.id, operator.id);
  assert.equal(ownHistoryDetail.body.data.handedOverBy.id, operator.id);
  assert.equal(ownHistoryDetail.body.data.returnedAt, null);
  const returnQueuePage = await request('/borrow-histories/return-queue?page=1&pageSize=1', checkinOnlyToken);
  assert.equal(returnQueuePage.status, 200, JSON.stringify(returnQueuePage.body));
  assert.equal(returnQueuePage.body.data.page, 1);
  assert.equal(returnQueuePage.body.data.pageSize, 1);
  assert.ok(returnQueuePage.body.data.items.length <= 1);
  const returnQueueAll = await request('/borrow-histories/return-queue?page=1&pageSize=100', checkinOnlyToken);
  assert.equal(returnQueueAll.status, 200, JSON.stringify(returnQueueAll.body));
  assert.equal(returnQueueAll.body.data.page, 1);
  assert.equal(returnQueueAll.body.data.pageSize, 100);
  const lifecycleReturnGroup = returnQueueAll.body.data.items.find((item: { requestId: number }) => item.requestId === lifecycleRequestId);
  const secondReturnGroup = returnQueueAll.body.data.items.find((item: { requestId: number }) => item.requestId === queueSecondRequestId);
  const groupedReturnGroup = returnQueueAll.body.data.items.find((item: { requestId: number }) => item.requestId === groupedRequestId);
  assert.ok(lifecycleReturnGroup);
  assert.ok(secondReturnGroup);
  assert.ok(groupedReturnGroup);
  assert.equal(lifecycleReturnGroup.pendingCount, 1);
  assert.equal(lifecycleReturnGroup.items[0].id, historyId);
  assert.equal(lifecycleReturnGroup.items[0].expectedReturnDate, '2099-01-01');
  assert.equal(lifecycleReturnGroup.items[0].borrower.id, borrower.id);
  assert.equal(groupedReturnGroup.pendingCount, 2);
  assert.deepEqual(
    groupedReturnGroup.items.map((item: { detailId: number }) => item.detailId),
    [groupedDetailAId, groupedDetailBId],
  );
  assert.ok(returnQueueAll.body.data.items.indexOf(lifecycleReturnGroup) < returnQueueAll.body.data.items.indexOf(secondReturnGroup));
  const groupedReturnDetail = await request(
    `/borrow-histories/return-queue/${groupedRequestId}`,
    checkinOnlyToken,
  );
  assert.equal(groupedReturnDetail.status, 200, JSON.stringify(groupedReturnDetail.body));
  assert.equal(groupedReturnDetail.body.data.requestId, groupedRequestId);
  assert.equal(groupedReturnDetail.body.data.pendingCount, 2);
  assert.deepEqual(
    groupedReturnDetail.body.data.items.map((item: { detailId: number }) => item.detailId),
    [groupedDetailAId, groupedDetailBId],
  );
  assert.equal(
    (await request(`/borrow-histories/return-queue/${groupedRequestId}`, noPermissionToken)).status,
    403,
  );
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
  const returnedActivity = await request('/borrow-histories/activity/me?state=RETURNED&page=1&pageSize=100', borrowerToken);
  assert.equal(returnedActivity.status, 200, JSON.stringify(returnedActivity.body));
  const lifecycleReturnedActivity = returnedActivity.body.data.items.find((item: { requestId: number }) => item.requestId === lifecycleRequestId);
  assert.ok(lifecycleReturnedActivity);
  assert.equal(lifecycleReturnedActivity.itemCount, 1);
  assert.equal(lifecycleReturnedActivity.items[0].id, historyId);
  assert.equal(Object.hasOwn(lifecycleReturnedActivity, 'status'), false);
  const returnedHistoryDetail = await request(`/borrow-histories/${historyId}`, borrowerToken);
  assert.equal(returnedHistoryDetail.status, 200, JSON.stringify(returnedHistoryDetail.body));
  assert.equal(returnedHistoryDetail.body.data.receivedBy.id, operator.id);
  assert.equal(returnedHistoryDetail.body.data.returnCondition, 'NORMAL');
  const currentTabAfterReturn = await request('/borrow-histories/me?state=CURRENT', borrowerToken);
  assert.ok(!currentTabAfterReturn.body.data.items.some((item: { id: number }) => item.id === historyId));
  const returnQueueAfterReturn = await request('/borrow-histories/return-queue', checkinOnlyToken);
  assert.equal(returnQueueAfterReturn.status, 200, JSON.stringify(returnQueueAfterReturn.body));
  assert.ok(!returnQueueAfterReturn.body.data.items.some((item: { requestId: number }) => item.requestId === lifecycleRequestId));
  assert.ok(returnQueueAfterReturn.body.data.items.some((item: { requestId: number; items: Array<{ id: number }> }) =>
    item.requestId === queueSecondRequestId && item.items.some((history) => history.id === secondHistoryId)));
  assert.equal((await request(`/borrow-histories/${secondHistoryId}/return`, checkinOnlyToken, { method: 'POST' })).status, 200);
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
  const damagedEvents = await prisma.outbox_events.findMany({
    where: { OR: [
      { event_type: 'borrow_history.returned_damaged', aggregate_id: damagedHistoryId },
      { event_type: 'asset_issue.created_from_damaged_return', aggregate_id: damagedIssueId },
    ] },
    select: { event_type: true },
  });
  assert.deepEqual(damagedEvents.map(row => row.event_type).sort(), [
    'asset_issue.created_from_damaged_return', 'borrow_history.returned_damaged',
  ]);
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
  assert.equal(await prisma.outbox_events.count({ where: {
    event_type: 'borrow_request_detail.approved', aggregate_id: bulkOkDetailId,
  } }), 1);
  assert.equal(await prisma.outbox_events.count({ where: {
    event_type: 'borrow_request_detail.approved', aggregate_id: bulkConflictDetailId,
  } }), 0);
  assert.equal(await prisma.outbox_events.count({ where: {
    event_type: 'borrow_request.approval_summary', aggregate_id: bulkRequestId,
  } }), 1);
  const approvalSummary = await prisma.outbox_events.findFirstOrThrow({
    where: { event_type: 'borrow_request.approval_summary', aggregate_id: bulkRequestId },
  });
  assert.deepEqual((approvalSummary.payload as any).approvalItems.map((item: any) => item.outcome), [
    'APPROVED', 'SKIPPED',
  ]);
  assert.equal((approvalSummary.payload as any).approvalItems[1].reason, 'ASSET_NOT_AVAILABLE');

  const bulkHandover = await request(
    `/borrow-request-details/${bulkOkDetailId}/handover`,
    checkoutOnlyToken,
    { method: 'POST' },
  );
  assert.equal(bulkHandover.status, 200, JSON.stringify(bulkHandover.body));
  assert.ok(bulkHandover.body.data.historyId);
  created.histories.push(bulkHandover.body.data.historyId as number);
  assert.equal(
    (await prisma.assets.findUniqueOrThrow({ where: { id: bulkAvailableAsset.id } })).status,
    'borrowed',
  );

  const cancelRequest = await request('/borrow-requests', borrowerToken, { method: 'POST', body: JSON.stringify({ note: 'Cancellation integration test', items: [{ assetId: cancelAsset.id, expectedReturnDate: '2099-01-01' }] }) });
  assert.equal(cancelRequest.status, 201);
  const cancelRequestId = cancelRequest.body.data.id as number;
  const cancelDetailId = cancelRequest.body.data.details[0].id as number;
  created.requests.push(cancelRequestId); created.details.push(cancelDetailId);
  assert.equal((await request(`/borrow-requests/${cancelRequestId}/cancel`, borrowerToken, { method: 'POST' })).status, 200);
  assert.equal((await prisma.borrow_requests.findUniqueOrThrow({ where: { id: cancelRequestId } })).status, 'cancelled');
});
