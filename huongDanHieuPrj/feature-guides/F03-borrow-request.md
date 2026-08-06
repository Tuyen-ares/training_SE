# F03 – Borrow Request

## Bức tranh nghiệp vụ

Employee chọn nhiều asset, nhập mục đích và ngày trả dự kiến để tạo một request. Request có header và nhiều detail. Tạo request chưa làm asset `RESERVED`; reservation xảy ra ở F04 khi approve.

## Spec cần đọc trước

- [F03 feature](../../docs/mvp-requirements/06-features/F03-borrow-request.md)
- [US-F03 stories](../../docs/mvp-requirements/07-user-stories/borrow-request/)
- [Borrow lifecycle contract](../../docs/contracts/borrow-lifecycle-contract-plan.md)
- [Borrow use cases](../../docs/use-cases/borrow-lifecycle/)

### Tóm tắt rule để đọc code

- Một request có nhiều `borrow_request_details`.
- Detail mới là `PENDING`.
- Expected return date phải hợp lệ.
- Người tạo chỉ xem/thu hồi request của mình.
- Chỉ được thu hồi trước actual handover/borrow history.

## Minimum Reading Path

1. [BorrowRequestCreateView.vue](../../apps/frontend/src/views/borrow/BorrowRequestCreateView.vue) – `loadAssets`, `addAsset`, `submit`.
2. [borrow.service.js](../../apps/frontend/src/services/borrow.service.js) – `createBorrowRequest`, `listMyBorrowRequests`, `getMyBorrowRequest`, `withdrawBorrowRequest`.
3. [borrow-request.routes.ts](../../apps/backend/src/routes/borrow-request.routes.ts).
4. [borrow-request.service.ts](../../apps/backend/src/services/borrow-request.service.ts) và `borrow-request.prisma.repository.ts`.
5. [borrow-lifecycle.integration.test.ts](../../apps/backend/tests/borrow-lifecycle.integration.test.ts).

## User Story/action chính

- `US-F03-01` – Tạo phiếu mượn nhiều asset.
- `US-F03-02` – Xem danh sách phiếu của mình.
- `US-F03-03` – Xem chi tiết phiếu của mình.
- `US-F03-04` – Thu hồi toàn bộ phiếu hợp lệ.

## Trace từng action

| User Story/action | Đường trace đầy đủ | Đọc |
|---|---|---|
| `US-F03-01` Tạo phiếu | `BorrowRequestCreateView:loadAssets/addAsset/submit` → `createBorrowRequest` → `POST /api/borrow-requests` → `borrow-request.routes.ts` permission `borrow_request.create` → `BorrowRequestController.create` → `BorrowRequestService.create` → `PrismaBorrowRequestRepository.createForRequester` → Prisma `BorrowRequest/BorrowRequestDetail` + `Asset` → DB `borrow_requests/borrow_request_details` → `borrow-lifecycle.integration.test.ts` | KỸ: repository duplicate/availability và service notification; LƯỚT: form |
| `US-F03-02` Xem danh sách của tôi | `MyRequestsView:load/changePage` → `listMyBorrowRequests` → `GET /api/borrow-requests/me` → `borrow-request.routes.ts` permission `borrow_request.view_own` → `BorrowRequestController.listMine` → `BorrowRequestService.listMine` → `PrismaBorrowRequestRepository.findPageForRequester` → Prisma `BorrowRequest` → DB `borrow_requests` → `borrow-lifecycle.integration.test.ts` | KỸ: requester scope; LƯỚT: pagination |
| `US-F03-03` Xem chi tiết của tôi | `BorrowRequestDetailView:load` → `getMyBorrowRequest` → `GET /api/borrow-requests/:id` → `borrow-request.routes.ts` permission `borrow_request.view_own` → `BorrowRequestController.getMine` → `BorrowRequestService.getMine` → `PrismaBorrowRequestRepository.findDetailForRequester` → Prisma `BorrowRequest/BorrowRequestDetail/Asset` → DB `borrow_requests/borrow_request_details/assets` → integration test | KỸ: ownership; LƯỚT: status color |
| `US-F03-04` Thu hồi phiếu | `BorrowRequestDetailView:withdraw` → `withdrawBorrowRequest` → `POST /api/borrow-requests/:id/cancel` → `borrow-request.routes.ts` permission `borrow_request.cancel_own` → `BorrowWorkflowController.withdraw` → `BorrowWorkflowService.withdraw` → `PrismaBorrowRequestRepository.withdraw` + `AssetService.cancelApprovedRequest` → Prisma `BorrowRequest/Asset/BorrowHistory` → DB `borrow_requests/assets/borrow_histories` → `borrow-lifecycle.integration.test.ts` | KỸ: borrow_history guard + transaction; LƯỚT: confirm dialog |

## SPEC EXPECTS

Request ownership thuộc employee. Detail status độc lập với header; header được refresh theo detail. Thu hồi trả `RESERVED` assets về `AVAILABLE` nhưng giữ lịch sử detail.

## CURRENT CODE

FE service và route thu hồi đã tồn tại; workflow service dùng transaction. Integration test kiểm tra create/approve/handover/return/cancel.

## GAPS

- Delivery status cũ có thể ghi frontend skeleton; evidence code hiện tại cho thấy `BorrowRequestDetailView:withdraw` đã nối API. Cần browser verification riêng nếu muốn gọi `VERIFIED` frontend.
