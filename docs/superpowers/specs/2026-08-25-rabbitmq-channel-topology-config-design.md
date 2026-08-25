# RabbitMQ Per-Channel Topology Configuration

## Goal

Prepare `apps/backend/.env.example` for a future RabbitMQ notification transport. The example enables RabbitMQ, documents two independent notification queues, and keeps all credentials blank.

This task changes configuration documentation only. It does not add a RabbitMQ client, publisher, consumer, dependency, or runtime behavior.

## Topology

The notification delivery exchange uses the `topic` type. Publishers use this routing-key format:

```text
notification.<channel>.<event_type>
```

Examples:

- `notification.in_app.borrow_request.created`
- `notification.email.asset_issue.repair_failed`

Two main queues are configured:

- `IN_APP` queue binds with `notification.in_app.#`.
- `EMAIL` queue binds with `notification.email.#`.

The `#` wildcard lets each channel queue receive all current and future domain event types for that channel. Adding a domain event therefore does not require another queue.

Each main queue declares the shared dead-letter exchange (DLX). The DLX uses the `direct` type, so each failed-message routing key must exactly match its DLQ binding key:

- IN_APP: `notification.in_app.failed`
- EMAIL: `notification.email.failed`

The two variables intentionally contain the same value for each channel but serve different directions: the main queue assigns the dead-letter routing key; the DLQ binding consumes that key from the DLX.

## Environment Contract

The RabbitMQ section will be organized into five English-commented groups.

### Connection and shared exchanges

```env
RABBITMQ_ENABLED=true
RABBITMQ_URL=
RABBITMQ_ENABLED_CHANNELS=IN_APP,EMAIL
RABBITMQ_DELIVERY_EXCHANGE=bigin.notification-deliveries
RABBITMQ_DELIVERY_EXCHANGE_TYPE=topic
RABBITMQ_DLX=bigin.dead-letter
RABBITMQ_DLX_TYPE=direct
```

`RABBITMQ_ENABLED_CHANNELS` is a comma-separated list. Future runtime code will split the value on commas and register only the listed channels.

### IN_APP channel

```env
RABBITMQ_IN_APP_QUEUE=bigin.notifications.in-app.v1
RABBITMQ_IN_APP_BINDING_KEY=notification.in_app.#
RABBITMQ_IN_APP_PREFETCH=20
RABBITMQ_IN_APP_DLQ=bigin.notifications.in-app.dlq.v1
RABBITMQ_IN_APP_DEAD_LETTER_ROUTING_KEY=notification.in_app.failed
RABBITMQ_IN_APP_DLQ_BINDING_KEY=notification.in_app.failed
```

### EMAIL channel

```env
RABBITMQ_EMAIL_QUEUE=bigin.notifications.email.v1
RABBITMQ_EMAIL_BINDING_KEY=notification.email.#
RABBITMQ_EMAIL_PREFETCH=5
RABBITMQ_EMAIL_DLQ=bigin.notifications.email.dlq.v1
RABBITMQ_EMAIL_DEAD_LETTER_ROUTING_KEY=notification.email.failed
RABBITMQ_EMAIL_DLQ_BINDING_KEY=notification.email.failed
```

IN_APP uses a higher prefetch because database writes are normally faster than SMTP network calls. These are safe example defaults, not fixed runtime limits.

## Future Firebase Realtime Delivery

`IN_APP` remains the business channel and queue name. Firebase Cloud Messaging is a future realtime transport behind that channel, not a separate RabbitMQ channel and not a reason to rename the queue to `FIREBASE`.

The database-backed in-app notification remains the source of truth. A future Firebase integration may notify the browser or device that new in-app data is available, but a Firebase outage must not remove or roll back the persisted notification.

## Future Teams Channel

Teams is intentionally not enabled in this task. A future implementation adds `TEAMS` to `RABBITMQ_ENABLED_CHANNELS`, declares the corresponding `RABBITMQ_TEAMS_*` variables, adds the Teams delivery handler, and adds the required database channel enum migration.

No channel selection will be implemented as a growing `if/else` chain. Future runtime code should load the comma-separated channel list and resolve each channel through a handler/config registry.

## Safety and Validation

- The real `RABBITMQ_URL` remains in the uncommitted `.env` file and must never be logged or committed.
- Setting `RABBITMQ_ENABLED=true` in `.env.example` documents the intended configuration; it does not make the current backend connect to RabbitMQ.
- Each environment key appears exactly once.
- The main exchange must remain `topic`; the DLX must remain `direct`.
- Each channel's dead-letter routing key must equal that channel's DLQ binding key.
- Existing SMTP and in-app database workers remain unchanged.
- Firebase runtime code and credentials are not added by this configuration-only task.

## Verification

- Audit the RabbitMQ block and confirm that all expected keys occur once.
- Confirm `RABBITMQ_ENABLED=true` and `RABBITMQ_URL=`.
- Confirm IN_APP and EMAIL use distinct main queues and DLQs.
- Run backend typecheck, the repository verification selector in dry-run mode, and `git diff --check`.
