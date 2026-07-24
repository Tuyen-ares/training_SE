# Tasks — Notification

## Phase 1 — Event Bus + In-App

- [ ] NOT-T01 Chốt event-recipient-template matrix.
  - Depends on: Borrow/Repair event contracts ổn định
  - Verify: mỗi event có recipient/title/content/data rõ ràng
- [ ] NOT-T02 Tạo DomainEvent envelope và in-process Event Bus.
  - Depends on: NOT-T01
  - Verify: subscribe/publish và listener isolation unit tests
- [ ] NOT-T03 Tích hợp event đầu tiên publish sau transaction commit.
  - Depends on: NOT-T02 và Borrow vertical slice
  - Verify: rollback không publish
- [ ] NOT-T04 Tạo Prisma notification model/migration.
  - Depends on: spec schema
  - Verify: unique/index/FK/migration review
- [ ] NOT-T05 Tạo Notification repository contract + Prisma implementation.
  - Depends on: NOT-T04
  - Verify: idempotent create và user-scoped queries
- [ ] NOT-T06 Tạo NotificationService và InApp channel.
  - Depends on: NOT-T05
  - Verify: duplicate event không tạo duplicate notification
- [ ] NOT-T07 Tạo event handlers/template mapping.
  - Depends on: NOT-T01, NOT-T02, NOT-T06
  - Verify: payload tối thiểu, không query chéo repository
- [ ] NOT-T08 Tạo controller/routes API In-App.
  - Depends on: NOT-T05, NOT-T06
  - Verify: list/count/read/read-all, ownership isolation
- [ ] NOT-T09 Viết unit/integration tests Phase 1.
  - Depends on: NOT-T02–T08
  - Verify: listener failure không đổi business result
- [ ] NOT-T10 Implement frontend notification center/unread badge.
  - Depends on: NOT-T08
  - Verify: current-user data, loading/empty/error/read states

## Phase 2 — Email, deferred

- [ ] NOT-T20 Chốt email provider và event/channel policy.
  - Depends on: product decision
  - Verify: provider/config/security được review
- [ ] NOT-T21 Tạo EmailProvider adapter và Email channel.
  - Depends on: NOT-T20
  - Verify: fake provider tests
- [ ] NOT-T22 Cô lập channel bằng `Promise.allSettled`.
  - Depends on: NOT-T21
  - Verify: email fail không mất In-App
- [ ] NOT-T23 Cân nhắc `notification_deliveries` và retry policy.
  - Depends on: yêu cầu theo dõi delivery
  - Verify: spec/plan/migration riêng được duyệt

## Phase 3 — Outbox, deferred

- [ ] NOT-T30 Lập spec/plan riêng cho guaranteed delivery.
  - Depends on: yêu cầu không được mất email/event
  - Verify: worker, retry, idempotency, retention được chốt
- [ ] NOT-T31 Implement outbox/worker theo plan đã duyệt.
  - Depends on: NOT-T30
  - Verify: crash/restart/retry integration tests
