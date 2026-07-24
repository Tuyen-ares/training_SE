# Tasks — Borrowing

> Module chưa implement. Các task được giữ unchecked cho tới khi có code và verify.

## Gate: quyết định trước code

- [ ] BOR-T01 Chốt cancel pending, reject note, overdue và borrowing limit.
  - Depends on: product decision
  - Output: cập nhật `spec.md`
  - Verify: không còn câu hỏi ảnh hưởng enum/API của phase đầu
- [ ] BOR-T02 Review schema/index/constraint và tạo migration nếu cần.
  - Depends on: BOR-T01
  - Output: Prisma schema/migration
  - Verify: `prisma validate` + review migration SQL

## Backend foundation

- [ ] BOR-T03 Tạo DTO/model và Zod validation.
  - Depends on: BOR-T01
  - Verify: duplicate asset, invalid date, empty list bị từ chối
- [ ] BOR-T04 Tạo Borrow repository contract + Prisma implementation.
  - Depends on: BOR-T02
  - Verify: repository không update bảng Asset/User
- [ ] BOR-T05 Tạo BorrowHistory repository contract + implementation.
  - Depends on: BOR-T02
  - Verify: create histories và conditional return

## Vertical slices

- [ ] BOR-T06 [REQ-0510, REQ-0531–0534] Implement create + reserve transaction.
  - Depends on: BOR-T03, BOR-T04, AssetService
  - Verify: rollback toàn bộ khi một asset không available
- [ ] BOR-T07 Implement query mine/all/detail với ownership.
  - Depends on: BOR-T04
  - Verify: staff không đọc đơn người khác
- [ ] BOR-T08 [REQ-0511, REQ-0520] Implement approve all-or-nothing.
  - Depends on: BOR-T04, BOR-T05, BOR-T06
  - Verify: request, asset, history cùng commit/rollback
- [ ] BOR-T09 [REQ-0512] Implement reject + release reservations.
  - Depends on: BOR-T04, BOR-T06
  - Verify: asset về available chỉ khi request pending
- [ ] BOR-T10 [REQ-0513] Implement return good/damaged.
  - Depends on: BOR-T05, BOR-T08
  - Verify: history return date + asset status cùng transaction

## HTTP, event và verification

- [ ] BOR-T11 Tạo controller/routes và gắn permission/ownership guard.
  - Depends on: BOR-T06–T10
  - Verify: HTTP scenarios own/all/approve/reject/return
- [ ] BOR-T12 Viết unit tests BorrowService.
  - Depends on: BOR-T06–T10
  - Verify: business branches có test
- [ ] BOR-T13 Viết DB integration/concurrency tests.
  - Depends on: BOR-T06–T10
  - Verify: reserve và approve/reject race chỉ một thắng
- [ ] BOR-T14 Publish domain events sau commit.
  - Depends on: Event Bus phase 1
  - Verify: rollback không phát event
- [ ] BOR-T15 Implement frontend staff borrowing flow.
  - Depends on: BOR-T07, BOR-T11
  - Verify: create/mine/detail/history
- [ ] BOR-T16 Implement frontend manager approval/return flow.
  - Depends on: BOR-T08–T11
  - Verify: queue/approve/reject/check-in
- [ ] BOR-T17 Chạy verification cuối.
  - Depends on: BOR-T03–T16 thuộc scope
  - Verify: backend typecheck/build/tests + frontend build + acceptance review
