# F05 – Handover & Return

## Bức tranh nghiệp vụ

Sau khi approve, người có quyền xác nhận bàn giao. Hệ thống tạo `borrow_histories` và đổi asset `RESERVED → BORROWED`. Khi nhận lại, normal return cập nhật history và đổi asset `BORROWED → AVAILABLE`.

## Spec cần đọc trước

- [F05 feature](../../docs/mvp-requirements/06-features/F05-handover-return.md)
- [US-F05 stories](../../docs/mvp-requirements/07-user-stories/handover-return/)
- [Handover/return contract](../../docs/contracts/borrow-lifecycle-contract-plan.md)
- [Borrow use cases](../../docs/use-cases/borrow-lifecycle/)

### Tóm tắt rule để đọc code

- `handed_over_by` là người xác nhận giao.
- `received_by` là người nhận lại, không phải employee mượn.
- Một detail chỉ có một history.
- Return bình thường cần history chưa có `return_date` và asset đang `BORROWED`.
- Thu hồi request bị chặn nếu đã có history/actual handover.

## Minimum Reading Path

1. [ApprovalDetailView.vue](../../apps/frontend/src/views/borrow/ApprovalDetailView.vue) – `handover`.
2. [HandoverReturnView.vue](../../apps/frontend/src/views/borrow/HandoverReturnView.vue) – `load`, `confirmReturn`.
3. [BorrowingActivityView.vue](../../apps/frontend/src/views/borrow/BorrowingActivityView.vue) – `load`, `tabChange`.
4. [borrow-workflow.service.ts](../../apps/backend/src/services/borrow-workflow.service.ts).
5. [borrow-lifecycle.integration.test.ts](../../apps/backend/tests/borrow-lifecycle.integration.test.ts).

## User Story/action chính

- `US-F05-01` – Confirm handover.
- `US-F05-02` – Xem tài sản đang mượn.
- `US-F05-03` – Confirm normal return.
- `US-F05-04` – Xem history của mình.
- `US-F05-05` – Xem toàn bộ history theo permission.

## Trace từng action

| User Story/action | Đường trace đầy đủ | Đọc |
|---|---|---|
| `US-F05-01` Confirm handover | `ApprovalDetailView:handover` → `handoverBorrowDetail` → `POST /api/borrow-request-details/:detailId/handover` → `borrow-request-detail.routes.ts` permission `asset.checkout` → `BorrowWorkflowController.handover` → `BorrowWorkflowService.handover` → `AssetService.confirmHandover` + `PrismaBorrowRequestRepository.createHistory` → Prisma `Asset/BorrowHistory` → DB `assets/borrow_histories` → borrow lifecycle integration test | KỸ: state/transaction/audit actor; LƯỚT: button |
| `US-F05-02` Xem đang mượn | `BorrowingActivityView:load/tabChange` → `listCurrentBorrowing` hoặc `listAllBorrowHistory` → `GET /api/borrow-histories/current` hoặc `/api/borrow-histories` → `borrow-history.routes.ts` permission `borrow_history.view_own`/`borrow_history.view_all` → `BorrowWorkflowController.current/allHistory` → `BorrowWorkflowService.listCurrent/listHistory` → `PrismaBorrowRequestRepository.listCurrent/listHistory` → Prisma `BorrowHistory` + request/detail/asset → DB `borrow_histories` với `return_date IS NULL` → integration test | KỸ: own/all permission scope |
| `US-F05-03` Trả bình thường | `HandoverReturnView:load/confirmReturn` → `listAllBorrowHistory/receiveNormalReturn` → `GET /api/borrow-histories` + `POST /api/borrow-histories/:historyId/return` → `borrow-history.routes.ts` permission `asset.checkin` → `BorrowWorkflowController.allHistory/returnNormal` → `BorrowWorkflowService.returnNormal` → `PrismaBorrowRequestRepository.completeReturn` + `AssetService.returnAsset` → Prisma `BorrowHistory/Asset/BorrowRequest` → DB history/assets/request status → borrow lifecycle integration test | KỸ: transaction/normal condition; LƯỚT: modal |
| `US-F05-04` Xem history của tôi | `BorrowingActivityView:load` → `listMyBorrowHistory` → `GET /api/borrow-histories/me` → `borrow-history.routes.ts` permission `borrow_history.view_own` → `BorrowWorkflowController.ownHistory` → `BorrowWorkflowService.listHistory(requesterId)` → `PrismaBorrowRequestRepository.listHistory` → Prisma `BorrowHistory/BorrowRequestDetail/BorrowRequest/Asset` → DB `borrow_histories` joins → integration test | LƯỚT: table; KỸ: requester scope |
| `US-F05-05` Xem toàn bộ history | `BorrowingActivityView:load` khi có `borrow_history.view_all` → `listAllBorrowHistory` → `GET /api/borrow-histories` → `borrow-history.routes.ts` permission `borrow_history.view_all` → `BorrowWorkflowController.allHistory` → `BorrowWorkflowService.listHistory(query)` → `PrismaBorrowRequestRepository.listHistory` → Prisma borrow graph → DB company-wide `borrow_histories` → integration test | KỸ: permission scope; LƯỚT: pagination |

## SPEC EXPECTS

Borrowing Activity là nơi xem current/history. Handover/return là action của user có permission, không phải thao tác của employee tự xác nhận.

## CURRENT CODE

API normal handover/return/current/history và FE screens đã tồn tại. Evidence: routes, `BorrowWorkflowService`, `HandoverReturnView`, `BorrowingActivityView`, integration test.

## GAPS

- Nhánh trả hỏng combined (`return-damaged`) chưa có API/service transaction trong branch hiện tại. Hiện FE HandoverReturn chỉ gọi `receiveNormalReturn`.
- Handover UI nằm trong Approval Detail; không có nghĩa phải tạo thêm page nếu action context hiện tại đủ.
