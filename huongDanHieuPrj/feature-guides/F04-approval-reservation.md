# F04 – Approval & Reservation

## Bức tranh nghiệp vụ

Reviewer có permission xem queue và xử lý detail. Approve detail phải atomically đổi detail thành `APPROVED` và asset `AVAILABLE → RESERVED`. Approve All cho partial success.

## Spec cần đọc trước

- [F04 feature](../../docs/mvp-requirements/06-features/F04-approval-reservation.md)
- [US-F04 stories](../../docs/mvp-requirements/07-user-stories/approval-reservation/)
- [Borrow lifecycle contract](../../docs/contracts/borrow-lifecycle-contract-plan.md)
- [Business Rules approval](../../docs/mvp-requirements/04-business-rules.md)

### Tóm tắt rule để đọc code

- Detail chỉ approve/reject khi đang `PENDING`.
- Approve phải giữ asset bằng transaction/conditional update.
- Asset đã `BORROWED`, `RESERVED` hoặc không khả dụng không được approve.
- Approve All không được biến conflict thành `REJECTED`; detail conflict giữ `PENDING`.
- Request header suy ra từ trạng thái các detail.

## Minimum Reading Path

1. [ApprovalDetailView.vue](../../apps/frontend/src/views/borrow/ApprovalDetailView.vue) – `approve`, `approveAll`, `reject`, `handover`.
2. [borrow.service.js](../../apps/frontend/src/services/borrow.service.js) – approve/reject API functions.
3. [borrow-workflow.service.ts](../../apps/backend/src/services/borrow-workflow.service.ts).
4. [borrow-request.prisma.repository.ts](../../apps/backend/src/repositories/borrow-request.prisma.repository.ts).
5. [borrow-lifecycle.integration.test.ts](../../apps/backend/tests/borrow-lifecycle.integration.test.ts) và [race-condition.integration.test.ts](../../apps/backend/tests/race-condition.integration.test.ts).

## User Story/action chính

- `US-F04-01` – Xem hàng đợi duyệt.
- `US-F04-02` – Duyệt một detail và giữ asset.
- `US-F04-03` – Từ chối một detail với lý do.
- `US-F04-04` – Approve All theo partial success.

## Trace từng action

| User Story/action | Đường trace đầy đủ | Đọc |
|---|---|---|
| `US-F04-01` Xem queue | `ApprovalQueueView:load/tabChange/pageChange` → `listReviewQueue` → `GET /api/borrow-request-details/review-queue` → `borrow-request-detail.routes.ts` permission `borrow_request.view_all` → `BorrowWorkflowController.reviewQueue` → `BorrowWorkflowService.listReviewQueue` → `PrismaBorrowRequestRepository.listReviewQueue` → Prisma `BorrowRequest/BorrowRequestDetail/Asset/User` → DB request/detail/asset tables → integration test | KỸ: query/status filter; LƯỚT: tabs/pagination |
| `US-F04-01` Xem detail | `ApprovalDetailView:load` → `getReviewRequest` → `GET /api/borrow-request-details/review-queue/:id` → `borrow-request-detail.routes.ts` permission `borrow_request.view_all` → `BorrowWorkflowController.reviewDetail` → `BorrowWorkflowService.getReviewDetail` → `PrismaBorrowRequestRepository.findDetailForReview` → Prisma request/detail/asset graph → DB request/detail/asset/user tables → integration test | LƯỚT: DTO; KỸ: permission route |
| `US-F04-02` Approve detail | `ApprovalDetailView:approve` → `approveBorrowDetail` → `POST /api/borrow-request-details/:detailId/approve` → `borrow-request-detail.routes.ts` permission `borrow_request.approve` → `BorrowWorkflowController.approve` → `BorrowWorkflowService.approve` → `AssetService.reserveForApprovedRequest` + `PrismaBorrowRequestRepository.approveDetail/refreshRequestStatus` → Prisma `Asset/BorrowRequestDetail/BorrowRequest` → DB `assets/borrow_request_details/borrow_requests` → borrow lifecycle + asset service tests | KỸ: transaction/state; LƯỚT: success message |
| `US-F04-03` Reject detail | `ApprovalDetailView:openReject/reject` → `rejectBorrowDetail` → `POST /api/borrow-request-details/:detailId/reject` → `borrow-request-detail.routes.ts` permission `borrow_request.reject` → `BorrowWorkflowController.reject` (validation) → `BorrowWorkflowService.reject` → `PrismaBorrowRequestRepository.rejectDetail/refreshRequestStatus` → Prisma `BorrowRequestDetail/BorrowRequest` → DB details/requests → borrow lifecycle integration test | KỸ: rejection reason/status |
| `US-F04-04` Approve All | `ApprovalDetailView:confirmApproveAll/approveAll` → `approveAllBorrowDetails` → `POST /api/borrow-requests/:requestId/approve-all` → `borrow-request.routes.ts` permission `borrow_request.approve` → `BorrowWorkflowController.approveAll` → `BorrowWorkflowService.approveAll` → từng detail gọi transaction `approve` (`AssetService.reserveForApprovedRequest` + repository updates) → Prisma `Asset/BorrowRequestDetail/BorrowRequest` → DB assets/details/requests → borrow lifecycle + race-condition tests | KỸ: partial result; LƯỚT: modal |

## SPEC EXPECTS

Approval chỉ thuộc detail; handover/return thuộc history. Header không được dùng để thay thế detail approval.

## CURRENT CODE

`BorrowWorkflowService.approve` đã có transaction; `approveAll` xử lý từng detail và giữ conflict ở `PENDING`. FE có action approve từng detail, reject và approve all. Evidence: các file trong Minimum Reading Path.

## GAPS

- Không nên dùng delivery-status cũ nói `US-F04-04 DEFERRED` nếu đang đánh giá branch hiện tại; route/service/FE function và tests đã có. Cần chạy lại browser/AC để nâng mức VERIFIED.
