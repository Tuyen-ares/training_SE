# F06 – Asset Issues & Repairs

## Bức tranh nghiệp vụ

Người đang mượn hoặc user có capability phù hợp có thể báo issue. Người có quyền review xác nhận/từ chối. Issue confirmed mới đi vào sửa chữa; sửa thành công trả asset về available, sửa thất bại giữ damaged.

## Spec cần đọc trước

- [F06 feature](../../docs/mvp-requirements/06-features/F06-asset-issues-repair.md)
- [US-F06 stories](../../docs/mvp-requirements/07-user-stories/asset-issues-repair/)
- [Business Rules issue](../../docs/mvp-requirements/04-business-rules.md)
- [Asset issue frontend flow](../../docs/delivery/frontend-spec/03-user-flows/06-asset-issues-repair.md)

### Tóm tắt rule để đọc code

- Report tạo `REPORTED`, chưa tự đổi asset sang `DAMAGED`.
- Confirm mới đổi asset sang `DAMAGED`.
- Confirm chỉ chấp nhận asset đang `AVAILABLE` hoặc `BORROWED`; không mở rộng sang `RESERVED`, `IN_REPAIR` hoặc `RETIRED`.
- Reject giữ note tùy chọn, chỉ chuyển issue `REPORTED → REJECTED` và không đổi asset.
- Start repair: `DAMAGED → IN_REPAIR`.
- Complete: `IN_REPAIR → AVAILABLE`.
- Fail: `IN_REPAIR → DAMAGED`.
- Return damaged là transaction F05/F06: history `DAMAGED`, asset `DAMAGED`, issue `CONFIRMED` và response trả `issueId`.
- Permission nằm ở route; current borrower exception được service kiểm tra khi report.

## Minimum Reading Path

1. [AssetIssueDetailView.vue](../../apps/frontend/src/views/issues/AssetIssueDetailView.vue) – `load`, `runTransition`, `confirmIssue`, `rejectIssue`.
2. [asset-issue.service.js](../../apps/frontend/src/services/asset-issue.service.js).
3. [asset-issue.routes.ts](../../apps/backend/src/routes/asset-issue.routes.ts).
4. [asset-issue.service.ts](../../apps/backend/src/services/asset-issue.service.ts) – `canReport`, `report`, `confirm`, `reject`, `startRepair`, `updateRepair`, `finishRepair`.
5. [asset-issue-notification.integration.test.ts](../../apps/backend/tests/asset-issue-notification.integration.test.ts).

## User Story/action chính

- `US-F06-01` – Báo sự cố asset.
- `US-F06-02` – Xem danh sách/chi tiết issue.
- `US-F06-03` – Confirm hoặc reject issue.
- `US-F06-04` – Bắt đầu sửa chữa.
- `US-F06-05` – Cập nhật thông tin sửa chữa.
- `US-F06-06` – Hoàn tất hoặc đánh dấu sửa chữa thất bại.

## Trace từng action

| User Story/action | Đường trace đầy đủ | Đọc |
|---|---|---|
| `US-F06-01` Report issue | `AssetDetailView:issueReported` hoặc `ReportIssueDialog` → `reportAssetIssue` → `POST /api/assets/:id/report-damaged` → `asset.routes.ts` (`requireAuth`; service cho phép `asset_issue.report` hoặc current borrower) → `AssetController.reportDamaged` → `AssetIssueService.report/canReport` → `PrismaAssetIssueRepository.create` + `NotificationService` → Prisma `AssetIssue/Notification` → DB `asset_issues/notifications` → asset issue integration test | KỸ: exception current borrower; LƯỚT: dialog |
| `US-F06-02` Xem list/detail | `AssetIssueListView:load/applyFilters/changePage` hoặc `AssetIssueDetailView:load` → `listAssetIssues/getAssetIssue` → `GET /api/asset-issues`/`:id` → `asset-issue.routes.ts` permission `asset_issue.view` → `AssetIssueController.list/getById` → `AssetIssueService.list/getById` → `PrismaAssetIssueRepository` → Prisma `AssetIssue/Asset/User` → DB `asset_issues/assets/users` → integration test | KỸ: permission/status; LƯỚT: filters |
| `US-F06-03` Confirm/reject issue | `AssetIssueDetailView:confirmIssue/rejectIssue` → `confirmAssetIssue/rejectAssetIssue` → `POST /api/asset-issues/:id/confirm` hoặc `/reject` → `asset-issue.routes.ts` permission `asset_issue.update` → `AssetIssueController.confirm/reject` → `AssetIssueService.confirm/reject/changeStatusWithAsset` → `PrismaAssetIssueRepository` transaction/transition → Prisma `AssetIssue/Asset` → DB `asset_issues/assets` → integration test | KỸ: allowed asset state + transaction |
| `US-F06-04` Start repair | `AssetIssueDetailView:runTransition` → `startAssetRepair` → `POST /api/asset-issues/:id/start-repair` → `asset-issue.routes.ts` permission `asset_issue.create` → `AssetIssueController.startRepair` → `AssetIssueService.startRepair` → `PrismaAssetIssueRepository` + asset update transaction → Prisma `AssetIssue/Asset` → DB `asset_issues/assets` → integration test | KỸ: `DAMAGED → IN_REPAIR` |
| `US-F06-05` Update repair | `AssetIssueDetailView:runTransition` → `updateAssetRepair` → `PATCH /api/asset-issues/:id/repair` → `asset-issue.routes.ts` permission `asset_issue.update` → `AssetIssueController.updateRepair` → `AssetIssueService.updateRepair` → `PrismaAssetIssueRepository.update` → Prisma `AssetIssue` → DB `asset_issues` → integration test | KỸ: repair fields; LƯỚT: form |
| `US-F06-06` Close repair | `AssetIssueDetailView:runTransition` → `completeAssetRepair/failAssetRepair` → `POST /complete` hoặc `/fail` → `asset-issue.routes.ts` permission `asset_issue.close` → `AssetIssueController.complete/fail` → `AssetIssueService.finishRepair` → `PrismaAssetIssueRepository` + asset status transaction → Prisma `AssetIssue/Asset` → DB `asset_issues/assets` → integration test | KỸ: complete/fail state; LƯỚT: modal fields |
| `US-F05-03/F06-03` Return damaged | `HandoverReturnView:confirmDamagedReturn` → `receiveDamagedReturn` → `POST /api/borrow-histories/:historyId/return-damaged` → `borrow-history.routes.ts` permission `asset.checkin` → `BorrowWorkflowController.returnDamaged` → `BorrowWorkflowService.returnDamaged` → `PrismaBorrowRequestRepository` transaction + `AssetService` → Prisma `borrow_histories/assets/asset_issues/notifications` → DB → borrow lifecycle integration test | KỸ: atomic state + `issueId`; LƯỚT: modal copy |

## SPEC EXPECTS

F06 xử lý issue lifecycle; không đồng nghĩa với việc employee tự đổi asset status. Trả hỏng là nhánh F05/F06 kết hợp và phải đọc guide F05.

Ở form Start Repair, `note` được dùng để ghi `Diagnosis / Initial notes`; không nhập `result` ở bước này. `result` chỉ mô tả kết quả kỹ thuật khi Update/Complete/Fail.

## CURRENT CODE

List/detail/report/review/repair có route, service, FE và integration test. Start Repair hiện hiển thị thông tin khởi tạo và `Diagnosis / Initial notes`; Repair result chỉ xuất hiện ở các bước Update/Complete/Fail. Notification của issue cũng được tạo trong service. Damaged Return hiện dùng cùng transaction với history, asset, issue và notification.

## GAPS

- Evidence/media, accessory checklist, signature và repair handback vẫn ngoài MVP. Evidence: [docs/future/scale-system.md](../../docs/future/scale-system.md).
