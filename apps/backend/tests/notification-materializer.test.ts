import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDomainEventDispatcher,
  parseOutboxDomainEvent,
} from '@/notifications/domain-event.js';
import { NotificationMaterializer } from '@/notifications/materializer.js';
import {
  RecipientResolver,
  PermanentRecipientError,
} from '@/notifications/recipient-resolver.js';
import { NotificationTemplateCatalog } from '@/notifications/template-catalog.js';
import type {
  ClaimedOutbox,
  MaterializedDelivery,
  OutboxRepository,
  RecipientRepository,
} from '@/notifications/repositories.js';

const row = {
  id: 1n,
  event_id: '00000000-0000-4000-8000-000000000001',
  event_type: 'borrow_request_detail.approved',
  event_version: 1,
  aggregate_type: 'BORROW_REQUEST_DETAIL',
  aggregate_id: 5,
  actor_user_id: 9,
  correlation_id: null,
  occurred_at: new Date(),
  payload: { requestId: 4, requesterId: 3 },
  dispatch_attempt_count: 1,
  locked_by: 'worker',
} as ClaimedOutbox;
const event = parseOutboxDomainEvent(row);
function outbox(
  capture: (items: readonly MaterializedDelivery[]) => void,
): OutboxRepository {
  return {
    claimDue: async () => [],
    finalizeDispatch: async (_claim, _event, items) => {
      capture(items);
      return true;
    },
    release: async () => true,
    fail: async () => true,
    cleanup: async () => 0,
  };
}

test('direct inactive recipient is retained for two skipped delivery snapshots', async () => {
  let deliveries: readonly MaterializedDelivery[] = [];
  const recipients: RecipientRepository = {
    findDirect: async () => ({
      userId: 3,
      email: 'old@example.test',
      active: false,
    }),
    findActiveByPermissions: async () => [],
  };
  const intents = await createDomainEventDispatcher().publish(event);
  await new NotificationMaterializer(
    new RecipientResolver(recipients),
    new NotificationTemplateCatalog(),
    outbox((value) => (deliveries = value)),
    'https://bigin.test',
  ).materialize(row, event, intents);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].recipient.active, false);
  assert.deepEqual(deliveries[0].intent.channels, ['IN_APP', 'EMAIL']);
  assert.equal(deliveries[0].messagePayload.deepLink, 'https://bigin.test/borrow-requests/4');
});
test('missing direct recipient is a permanent reference error and does not finalize', async () => {
  let finalized = false;
  const recipients: RecipientRepository = {
    findDirect: async () => null,
    findActiveByPermissions: async () => [],
  };
  const intents = await createDomainEventDispatcher().publish(event);
  await assert.rejects(
    new NotificationMaterializer(
      new RecipientResolver(recipients),
      new NotificationTemplateCatalog(),
      outbox(() => {
        finalized = true;
      }),
      '',
    ).materialize(row, event, intents),
    PermanentRecipientError,
  );
  assert.equal(finalized, false);
});
test('permission recipient empty finalizes with zero deliveries', async () => {
  const permissionRow = {
    ...row,
    event_type: 'borrow_request.created',
    aggregate_type: 'BORROW_REQUEST',
  };
  const permissionEvent = parseOutboxDomainEvent(permissionRow);
  let count = -1;
  const recipients: RecipientRepository = {
    findDirect: async () => null,
    findActiveByPermissions: async () => [],
  };
  const intents = await createDomainEventDispatcher().publish(permissionEvent);
  await new NotificationMaterializer(
    new RecipientResolver(recipients),
    new NotificationTemplateCatalog(),
    outbox((items) => {
      count = items.length;
    }),
    '',
  ).materialize(permissionRow, permissionEvent, intents);
  assert.equal(count, 0);
});
