# Generic Outbound Notification Message ID

## Goal

Remove the SMTP-specific column name from `notification_deliveries` without losing retry identity or introducing provider-specific columns for future channels such as Teams.

This change does not add Teams, RabbitMQ runtime, Firebase runtime, a public API, or a new notification channel.

## Decision

Rename `notification_deliveries.smtp_message_id` to `outbound_message_id`.

- `outbound_message_id` is assigned by BigIn before provider I/O. It stays stable across retries. For EMAIL, the value is used as the RFC Message-ID header.
- `provider_message_id` remains optional and keeps its current write behavior. Duplicate SMTP values are explicitly deferred to a later decision.
- IN_APP normally leaves both fields null.
- A future TEAMS delivery reuses these fields. It must not add `teams_message_id`.

The current unique key `(event_id, recipient_user_id, channel)` remains the database idempotency guard. `outbound_message_id` is not renamed to `idempotency_key` because an SMTP Message-ID does not guarantee provider-side deduplication.

## Alternatives Considered

### Keep `smtp_message_id`

This avoids a migration but preserves an unnecessary SMTP-specific schema dependency and encourages another provider-specific column when Teams is added.

### Store every ID in `provider_message_id`

This mixes two different moments: an application-assigned ID available before sending and a provider-assigned ID available after sending. It also makes stable retry identity unclear.

### Generic outbound/provider pair

This is the selected approach. It keeps the two meanings separate and supports future channels without adding columns per provider.

## Database Migration

Add a forward-only migration after `20260825120000_remove_redundant_notification_columns`.

1. Rename the existing nullable `VARCHAR(255)` column with MariaDB `CHANGE COLUMN`, preserving every stored value:

```sql
ALTER TABLE notification_deliveries
  CHANGE COLUMN smtp_message_id outbound_message_id VARCHAR(255) NULL;
```

No data cleanup is part of this migration. Every `provider_message_id` value,
including values equal to the renamed outbound ID, remains unchanged.
Historical migration files are immutable and must not be edited.

Applying this migration to Aiven is a separate production operation. Implementation and source verification do not authorize production deployment automatically.

## Runtime Changes

- Rename Prisma and repository mappings from `smtp_message_id`/`smtpMessageId` to `outbound_message_id`/`outboundMessageId`.
- Keep the SMTP provider input property `messageId`, because that is the Nodemailer/RFC field name.
- The EMAIL handler requires `outboundMessageId` and passes it to Nodemailer.
- Nodemailer and the generic delivery processor keep their existing
  `providerMessageId` behavior. Provider-ID deduplication is outside this
  change.
- Retry, lease ownership, cooldown, status transitions, snapshot content and deterministic SMTP Message-ID generation remain unchanged.

## Teams Extension

A future Teams integration adds `TEAMS` to the delivery-channel enum and registers a Teams handler. Each Teams delivery is another row:

```text
channel = TEAMS
outbound_message_id = BigIn-assigned request/message ID when supported
provider_message_id = Teams-assigned message ID after success
```

Teams destination data continues to use the generic recipient/destination field. Rich Teams payload requirements must be designed separately; this change does not add speculative `teams_*` columns.

## Outbox Relationship

`notification_deliveries.event_id` remains a logical reference to
`outbox_events.event_id`; this change does not add a foreign key. The two
tables intentionally support independent cleanup because outbox operational
records may expire before delivery history. The existing unique delivery key
and atomic materialization transaction remain the integrity controls.

## Documentation

Update the active notification schema documentation, implementation plan, notification module spec and durable implementation memory. Do not change OpenAPI, the API catalog or frontend contracts because the HTTP behavior is unchanged.

## Verification

- Prisma format/generate/validate.
- Backend typecheck, build and unit tests.
- Focused notification database integration tests on a non-production test database when available.
- Source audit proving active code no longer references `smtp_message_id` or `smtpMessageId`; the historical creation migration is the only allowed old database-name reference.
- Verify-change dry-run before any full repository gate because the worktree contains unrelated frontend changes.
- `git diff --check`.
- If production deployment is separately approved: run Prisma migrate deploy/status and a read-only column/data audit without printing credentials.
