import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BorrowRequestNotificationObserver,
  BorrowHistoryNotificationObserver,
  AssetIssueNotificationObserver,
  DOMAIN_EVENT_TYPES,
  DomainEventDispatcher,
  PermanentDomainEventError,
  createDomainEventDispatcher,
  parseOutboxDomainEvent,
  type AggregateType,
  type DomainEvent,
  type DomainEventObserver,
} from '@/notifications/domain-event.js';

const occurredAt = new Date(0);
function row(
  eventType: string,
  aggregateType: AggregateType,
  payload: unknown,
  overrides: Record<string, unknown> = {},
) {
  return {
    event_id: '00000000-0000-4000-8000-000000000001',
    event_type: eventType,
    event_version: 1,
    aggregate_type: aggregateType,
    aggregate_id: 42,
    actor_user_id: 7,
    correlation_id: null,
    occurred_at: occurredAt,
    payload,
    ...overrides,
  };
}
const event = parseOutboxDomainEvent(
  row('borrow_request.created', 'BORROW_REQUEST', {
    requestId: 42,
    requesterId: 7,
  }),
);

test('event validator binds type to payload, aggregate and version', () => {
  assert.equal(event.eventType, 'borrow_request.created');
  assert.throws(
    () =>
      parseOutboxDomainEvent(
        row('borrow_request.created', 'ASSET_ISSUE', {
          requestId: 42,
          requesterId: 7,
        }),
      ),
    PermanentDomainEventError,
  );
  assert.throws(
    () =>
      parseOutboxDomainEvent(
        row('borrow_request.created', 'BORROW_REQUEST', { requestId: 42 }),
      ),
    PermanentDomainEventError,
  );
  assert.throws(
    () =>
      parseOutboxDomainEvent(
        row(
          'borrow_request.created',
          'BORROW_REQUEST',
          { requestId: 42, requesterId: 7 },
          { event_version: 2 },
        ),
      ),
    PermanentDomainEventError,
  );
  assert.throws(
    () =>
      parseOutboxDomainEvent(
        row('unknown', 'BORROW_REQUEST', { requestId: 42, requesterId: 7 }),
      ),
    PermanentDomainEventError,
  );
  assert.throws(
    () =>
      parseOutboxDomainEvent(
        row('asset_issue.reported', 'ASSET_ISSUE', {
          issueId: 0,
          reporterId: 7,
        }),
      ),
    PermanentDomainEventError,
  );
});

test('dispatcher invokes only subscribed observers and aggregates intents', async () => {
  let ignored = false;
  const observer: DomainEventObserver = new BorrowRequestNotificationObserver();
  const dispatcher = new DomainEventDispatcher([
    observer,
    {
      subscribedEventTypes: ['asset_issue.reported'],
      async onEvent() {
        ignored = true;
        return [];
      },
    },
  ]);
  const intents = await dispatcher.publish(event);
  assert.equal(ignored, false);
  assert.equal(intents.length, 1);
  assert.deepEqual(intents[0].channels, ['IN_APP', 'EMAIL']);
  assert.deepEqual(intents[0].recipient, {
    kind: 'ANY_PERMISSION',
    permissionCodes: ['borrow_request.view_all', 'borrow_request.approve'],
    excludedUserIds: [7],
  });
});

test('rich snapshots validate and bulk detail audit events suppress their own notification', async () => {
  const rich = parseOutboxDomainEvent(
    row('borrow_request_detail.approved', 'BORROW_REQUEST_DETAIL', {
      requestId: 42,
      requesterId: 7,
      requesterName: 'Requester',
      actorName: 'Reviewer',
      detailId: 8,
      assetId: 9,
      assetCode: 'LAP-001',
      assetModelName: 'Latitude',
      expectedReturnDate: '2026-08-30',
      notificationSuppressed: true,
      bulkAction: true,
      deepLinkContext: { entityType: 'BORROW_REQUEST', entityId: 42 },
    }),
  );
  assert.deepEqual(await createDomainEventDispatcher().publish(rich), []);
  const summary = parseOutboxDomainEvent(
    row('borrow_request.approval_summary', 'BORROW_REQUEST', {
      requestId: 42,
      requesterId: 7,
      requesterName: 'Requester',
      actorName: 'Reviewer',
      approvalItems: [
        {
          detailId: 8,
          assetId: 9,
          assetCode: 'LAP-001',
          assetModelName: 'Latitude',
          expectedReturnDate: '2026-08-30',
          outcome: 'APPROVED',
        },
      ],
    }),
  );
  assert.equal(summary.payload.approvalItems?.[0].outcome, 'APPROVED');
  assert.equal(
    (await createDomainEventDispatcher().publish(summary)).length,
    1,
  );
});

test('observer error rejects the whole dispatch', async () => {
  const dispatcher = new DomainEventDispatcher([
    {
      subscribedEventTypes: ['borrow_request.created'],
      async onEvent() {
        throw new Error('boom');
      },
    },
  ]);
  await assert.rejects(dispatcher.publish(event), /boom/);
});

test('all fourteen event types have one versioned intent with a valid entity mapping', async () => {
  const dispatcher = createDomainEventDispatcher();
  for (const eventType of DOMAIN_EVENT_TYPES) {
    const isIssue = eventType.startsWith('asset_issue.');
    const aggregateType: AggregateType =
      eventType === 'borrow_request.created'
        ? 'BORROW_REQUEST'
        : eventType === 'borrow_request.approval_summary'
          ? 'BORROW_REQUEST'
        : eventType.startsWith('borrow_request_detail.')
          ? 'BORROW_REQUEST_DETAIL'
          : eventType.startsWith('borrow_history.')
            ? 'BORROW_HISTORY'
            : 'ASSET_ISSUE';
    const parsed = parseOutboxDomainEvent(
      row(
        eventType,
        aggregateType,
        isIssue
          ? { issueId: 9, reporterId: 7 }
          : { requestId: 42, requesterId: 7 },
      ),
    );
    const intents = await dispatcher.publish(parsed as DomainEvent);
    assert.equal(intents.length, 1, eventType);
    assert.equal(intents[0].templateVersion, 1);
    assert.equal('templateCode' in intents[0], false);
    assert.equal(intents[0].relatedEntityId, isIssue ? 9 : 42);
  }
});

test('three observers own all fourteen event types exactly once', () => {
  const subscriptions = [
    new BorrowRequestNotificationObserver(),
    new BorrowHistoryNotificationObserver(),
    new AssetIssueNotificationObserver(),
  ].flatMap((observer) => [...observer.subscribedEventTypes]);
  assert.equal(subscriptions.length, DOMAIN_EVENT_TYPES.length);
  assert.equal(new Set(subscriptions).size, DOMAIN_EVENT_TYPES.length);
  assert.deepEqual([...subscriptions].sort(), [...DOMAIN_EVENT_TYPES].sort());
});
