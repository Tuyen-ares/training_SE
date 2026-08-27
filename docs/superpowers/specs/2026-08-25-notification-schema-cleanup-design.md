# Notification Schema Cleanup Design

## Goal

Remove three persisted notification fields that the runtime writes but never
reads, without changing delivery behavior or prematurely adding RabbitMQ
semantics.

## Decision

Remove:

- `outbox_events.delivery_count`
- `notification_deliveries.template_code`
- `notification_deliveries.template_version`

Keep `skipped_at`, `correlation_id`, `dispatched_at`, the
application-assigned message ID, and `provider_message_id`. Their semantics
require separate decisions tied to RabbitMQ or multi-provider delivery.

The later generic rename from `smtp_message_id` to `outbound_message_id` is
governed by `2026-08-25-notification-outbound-message-id-design.md`.

## Alternatives

1. Minimal cleanup (selected): remove only fields proven unused after
   persistence.
2. Also remove optional timestamps: saves little and weakens explicit history.
3. Rename dispatch fields for RabbitMQ now: rejected because the current runtime
   still materializes deliveries directly from the outbox.

## Implementation

- Add a forward migration that drops the three columns.
- Update the Prisma schema and outbox finalization writes.
- Remove persisted-value assertions and documentation.
- Keep template code/version in memory for rendering.
- Preserve delivery uniqueness, status, retry, lease, snapshots, recipient,
  notification link, SMTP identifiers, and error fields.

Existing rows lose only redundant count/provenance values. Notification content
and delivery history remain intact. RabbitMQ publisher confirms, consumer
acknowledgement, correlation propagation, and publishing terminology remain a
later implementation.

## Verification

- Prisma schema and migration match.
- Backend typecheck, build, unit tests, and MariaDB integration tests pass.
- Materialization remains atomic and idempotent.
- Verification selection and `git diff --check` pass.
- Notification schema docs and implementation memory match the verified result.
