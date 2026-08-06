# Delivery Status Audit

> Audit date: 2026-08-05. Scope: repository evidence, automated verification,
> and manual browser verification of the Asset slice.
>
> Sources of requirement: `docs/mvp-requirements/` and
> `docs/frontend-spec/`. Release 1 is the normal borrow lifecycle agreed for
> this project: asset discovery, request, per-detail review, handover, normal
> return and history. Permissions are evaluated as effective permissions, never
> by hard-coded role names.

## How to read this file

- `US` means **User Story**: a small user need. `F02`, for example, is the
  Asset feature; the final number is the story within that feature.
- `DEFERRED` means excluded from Release 1, even when some old code or schema
  exists. It does not mean verified or ready.
- `IN_PROGRESS` can include schema/model preparation, but never means a usable
  end-to-end feature.
- `VERIFIED` is used only where contract, backend, frontend, permissions,
  database integration, build, and manual browser evidence agree.

## Audit summary

| Metric | Count |
| --- | ---: |
| User Stories audited | 40 |
| VERIFIED | 8 |
| IMPLEMENTED | 24 |
| IN_PROGRESS | 2 |
| MOCKUP_ONLY | 0 |
| NOT_STARTED | 0 |
| BLOCKED | 0 |
| DEFERRED | 6 |

### Shared evidence

- Requirements and named AC: `docs/mvp-requirements/07-user-stories/`.
- Screen and flow evidence: `docs/delivery/frontend-spec/02-screen-inventory.md` and
  `docs/delivery/frontend-spec/03-user-flows/`.
- Asset read/report and Asset write/catalog/retire/QR contracts are available
  under `docs/contracts/`.
- Registered backend resources are limited to Users, Departments, Brands,
  Asset Types, Asset Models, Assets, RBAC and Auth:
  `apps/backend/src/routes/index.ts`.
- Frontend routes are limited to login, public register, main, dashboard and
  users: `apps/frontend/src/router/index.js`.

## Release 1 status

| User Story | Tên dễ hiểu | Release | Contract | Backend | Frontend | Integration | Tests/AC | Status | Evidence | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| US-F01-01 | Đăng nhập | R1 prerequisite | None | Done | Done | Partial | Partial | IMPLEMENTED | `auth.routes.ts`, `auth.service.ts`, `Login.vue`, `stores/auth.js`, `auth.service.test.ts` | No story contract, frontend E2E/manual AC evidence absent. |
| US-F01-02 | Làm mới phiên | R1 prerequisite | None | Done | Done | Partial | Partial | IMPLEMENTED | `auth.routes.ts`, `auth.service.ts`, `stores/auth.js`, `auth.service.test.ts` | No story contract or frontend integration test. |
| US-F01-03 | Đăng xuất | R1 prerequisite | None | Done | Partial | Partial | Partial | IMPLEMENTED | `auth.routes.ts`, `auth.service.ts`, `stores/auth.js`, `Users.vue`, `auth.service.test.ts` | Logout control is not evidenced in a common AppShell; no frontend AC evidence. |
| US-F01-04 | Truy cập theo permission | R1 prerequisite | None | Done | Partial | Partial | Partial | IN_PROGRESS | `auth.middleware.ts`, `rbac.middleware.ts`, `router/index.js`, `auth.middleware.test.ts`, `rbac.service.test.ts` | Frontend routes only guard `user.view`; no evidence for R1 action routes or their real API integration. |
| US-F01-05 | Đăng ký và xét duyệt tài khoản | R1 planned | Requirement | Not started | Mock only | None | None | IN_PROGRESS | `US-F01-05-registration-review.md`, `SCR-SYS-03`, `register.vue` | UI validates and displays the pending-review state only. No request schema/table, review permission migration, review queue, API, or persistence exists yet. |
| US-F02-01 | Xem danh sách thiết bị | R1 | Implemented Match | Done | Done | Verified | Passed | VERIFIED | `docs/contracts/asset-read-and-report-issue.md`, `asset.controller.ts`, `AssetListView.vue`, `asset-api.integration.test.ts`; browser Asset List loaded real API data | None for the stated story AC. |
| US-F02-02 | Xem chi tiết thiết bị | R1 | Implemented Match | Done | Done | Verified | Passed | VERIFIED | `docs/contracts/asset-read-and-report-issue.md`, `AssetDetailView.vue`, `asset-api.integration.test.ts`; browser opened the created asset detail | None for the stated story AC. |
| US-F02-03 | Xem thiết bị có thể mượn | R1 | Implemented Match | Done | Done | Verified | Passed | VERIFIED | `status=AVAILABLE` contract, `AssetListView.vue`, `asset-api.integration.test.ts`; browser list showed current statuses from API | Borrow-request selection is tracked under F03, not this read story. |
| US-F03-01 | Tạo phiếu mượn | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | `docs/contracts/borrow-lifecycle.md`, create controller/service/repository, `borrow-lifecycle.integration.test.ts`; curl created a two-asset request with date-only values | Frontend form not implemented in this delivery. |
| US-F03-02 | Xem danh sách phiếu của tôi | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Own-list endpoint with ownership, status filter and pagination; curl returned HTTP 200 | Frontend list not connected. |
| US-F03-03 | Xem chi tiết phiếu của tôi | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Owner-scoped detail endpoint; DB integration and curl returned date-only detail data | Frontend detail not connected. |
| US-F04-01 | Xem hàng đợi duyệt | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Company-wide permission-gated paginated Review Queue, oldest first; curl HTTP 200 and 403 coverage | Review Queue frontend not connected. |
| US-F04-02 | Duyệt một detail | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Atomic approve/reserve service, conditional asset update and concurrency DB test; curl changed asset to RESERVED | Approval frontend not connected. |
| US-F04-03 | Từ chối một detail | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Strict reason validation, reviewer/time persistence and atomic status refresh; curl HTTP 200 | Rejection frontend not connected. |
| US-F05-01 | Xác nhận bàn giao | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Atomic handover/history creation and duplicate guard; curl returned a history ID | Fulfillment frontend not connected. |
| US-F05-02 | Xem tài sản đang mượn | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Owner-scoped paginated current history DTO; curl returned `expectedReturnDate=2099-01-01` | Current-borrow frontend not connected. |
| US-F05-03 | Xác nhận hoàn trả | R1 normal-return path | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Empty-body normal return transaction writes canonical `NORMAL`, completes history and restores AVAILABLE; curl and DB integration passed | Frontend not connected; damaged return remains deferred. |
| US-F05-04 | Xem lịch sử mượn của tôi | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Owner-scoped paginated camelCase history; curl confirmed `NORMAL` and returned asset data | History frontend not connected. |
| US-F05-05 | Xem toàn bộ lịch sử mượn | R1 | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Company-wide `borrow_history.view_all` route with pagination; curl HTTP 200 and missing-permission 403 coverage | All-history frontend not connected. |

### Release 1 delivery gates

1. Define and review the shared Asset/Borrow/History DTO and error contract.
2. Implement and test the slices in dependency order: F02 read/selection -> F03
   request -> F04 review -> F05 handover/current borrow -> normal return/history.
3. Add real frontend routes and API calls for each slice.
4. Resolve the Open Questions below before locking the affected contract.
5. Repair or isolate the failing database race tests before treating persistence
   or concurrency AC as verified.

## Additional feature status

| User Story | Tên dễ hiểu | Release | Contract | Backend | Frontend | Integration | Tests/AC | Status | Evidence | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| US-F02-04 | Tạo thiết bị | R1 Asset management | Implemented Match | Done | Done | Verified | Passed | VERIFIED | `docs/contracts/asset-management-write-catalog-retire-qr.md`, `asset.controller.ts`, `assets.service.ts`, `AssetFormView.vue`, `asset-api.integration.test.ts`; browser created asset 128 as AVAILABLE with server-generated QR | None for the agreed scope. |
| US-F02-05 | Cập nhật thiết bị | R1 Asset management | Implemented Match | Done | Done | Verified | Passed | VERIFIED | Shared `AssetFormView.vue`, `asset.service.js`, strict update DTO, integration test; browser updated serial while QR/status remained server-controlled | None for the agreed scope. |
| US-F02-06 | Quản lý danh mục thiết bị | R1 Asset management | Implemented Match | Done | Done | Verified | Passed | VERIFIED | Catalog controllers/routes, `AssetCatalogView.vue`, `asset-catalog.service.js`, integration test; browser created and updated a Brand; DELETE routes return 404 | No delete by design. |
| US-F02-07 | Ngừng sử dụng thiết bị | R1 Asset management | Implemented Match | Done | Done | Verified | Passed | VERIFIED | `AssetService.retire`, dedicated retire route, confirmation UI, unit and DB integration tests for all allowed/blocked states; browser retired asset 128 | None for normal retire scope. |
| US-F02-08 | Tra cứu thiết bị bằng QR | R1 Asset management | Implemented Match | Done | Done | Verified | Passed | VERIFIED | `GET /api/assets/by-qr/:qrCode`, `AssetListView.vue`, integration test; browser pasted generated QR and opened `/assets/128` without status change | Camera/scanner capture intentionally out of scope; lookup API is reusable. |
| US-F03-04 | Thu hồi phiếu | R1 API | Implemented Match | Done | Skeleton | API | Passed | IMPLEMENTED | Owner-scoped cancel endpoint releases reserved assets transactionally; DB integration test passed | Frontend action not connected. |
| US-F04-04 | Duyệt tất cả theo partial success | Deferred | None | Partial | Skeleton | None | None | DEFERRED | borrow detail schema, `FLOW-10` | No bulk action/service/result contract or UI. |
| US-F05-03 | Hoàn trả thiết bị hỏng | Deferred phase 2 branch | None | Partial | Skeleton | None | Partial | DEFERRED | `AssetService.returnAsset`, `asset_issues` schema, `FLOW-13` | No combined return-and-issue transaction; excluded from R1. |
| US-F06-01 | Báo sự cố | R1 slice | Done | Done | Done | API | API/DB | IMPLEMENTED | `AssetIssueService`, `ReportIssueDialog.vue`, `asset-api.integration.test.ts` | Issue list, review and repair remain deferred. |
| US-F06-02 | Xem danh sách và chi tiết sự cố | Current | Implemented Match | Done | Done | API/UI | API/DB + browser | IMPLEMENTED | Asset issue routes/services, `AssetIssueListView.vue`, `AssetIssueDetailView.vue`; browser loaded real list/detail data | No automated frontend test suite. |
| US-F06-03 | Xác minh sự cố | Current | Implemented Match | Done | Done | API/UI | API/DB | IMPLEMENTED | Transactional confirm/reject APIs and permission/status-aware detail actions | Destructive transition was not repeated in browser verification. |
| US-F06-04 | Bắt đầu sửa chữa | Current | Implemented Match | Done | Done | API/UI | API/DB | IMPLEMENTED | Start-repair API plus modal workflow state in Issue Detail | No automated frontend interaction test. |
| US-F06-05 | Cập nhật quá trình sửa chữa | Current | Implemented Match | Done | Done | API/UI | API/DB | IMPLEMENTED | Repair update API and shared modal with provider/date/cost/result/note fields | No automated frontend interaction test. |
| US-F06-06 | Kết thúc sửa chữa | Current | Implemented Match | Done | Done | API/UI | API/DB | IMPLEMENTED | Complete/fail APIs and status/permission-aware actions in Issue Detail | No automated frontend interaction test. |
| US-F07-01 | Xem thông báo | Current | Implemented Match | Done | Done | Verified API/UI | API/DB + browser | IMPLEMENTED | Owner-scoped list/unread-count APIs, header badge, full Notification Center; browser loaded real notifications | No automated frontend test suite. |
| US-F07-02 | Đánh dấu thông báo đã đọc | Current | Implemented Match | Done | Done | Verified API/UI | API/DB + browser | IMPLEMENTED | Single/all read PATCH APIs; browser navigation reduced unread badge from 5 to 4 | Mark-all was not executed to preserve remaining review data. |
| US-F07-03 | Mở đối tượng liên quan từ thông báo | Current | Implemented Match | Done | Done | API/UI | Browser | IMPLEMENTED | Logical navigation supports borrow requests and asset issues with capability checks and safe missing/forbidden feedback | A legacy notification referenced deleted issue #35 and correctly rendered safe unavailable state. |
| US-F08-01 | Xem danh sách người dùng | Deferred | None | Done | Done | Partial | Partial | DEFERRED | `user.routes.ts`, `Users.vue`, `user-api.integration.test.ts` | Outside R1; no story contract or frontend AC evidence. |
| US-F08-02 | Tạo người dùng | Deferred | None | Done | Done | Partial | Partial | DEFERRED | `user.routes.ts`, `user.service.ts`, `Users.vue`, `user.service.test.ts` | Outside R1; FE has no avatar field required by story. |
| US-F08-03 | Cập nhật người dùng | Deferred | None | Done | Partial | Partial | Partial | DEFERRED | `user.routes.ts`, `user.service.ts`, `user.service.test.ts` | Outside R1; routed FE only creates/activates/deactivates, no edit flow. |
| US-F08-04 | Kích hoạt hoặc vô hiệu hóa người dùng | Deferred | None | Done | Done | Partial | Partial | DEFERRED | `user.routes.ts`, `Users.vue`, `user.service.test.ts`, `user-api.integration.test.ts` | Outside R1; no frontend automated AC evidence. |
| US-F08-05 | Gán hoặc gỡ role có sẵn | Deferred | None | Done | Partial | Partial | Partial | DEFERRED | `rbac.routes.ts`, `rbac.service.ts`, `Users.vue`, `rbac.service.test.ts` | Outside R1; UI supplies roles only at create, not standalone replace/remove on an existing user. |

## Discrepancies found

1. **Asset, Borrow and Repair lifecycle API contracts are implemented.** Their
   runtime screens use the shared authenticated AppShell and effective-permission guards.
2. **F03–F08 operational frontend routes are registered.** Verification depth
   remains story-specific; an existing route or screen alone is not marked `VERIFIED`.
3. **The legacy `POST /api/assets/:id/report-damaged` path is now an issue
   report action.** It creates `REPORTED` without changing asset status; its
   legacy name remains solely for compatibility.
4. **Registration approval is specified but not implemented.** The existing
   backend registration path creates a user directly, while the frontend only
   presents a pending-review interaction. Neither implements the required
   pending request, reviewer decision, optional department, or default
   `employee` assignment.
5. **Asset Manager originally lacked `department.view`.** The idempotent data
   migration `20260804150000_grant_asset_manager_department_view` now maps that
   effective permission and has been deployed in the verification database.

## Open Questions

These questions are not resolved by the current requirements and must be
confirmed before the affected Release 1 contract is marked ready. This audit
does not decide them.

The F03–F05 questions about permission scope, date-only semantics, pagination
and normal-return condition were resolved on 2026-08-04 and are recorded in
`docs/contracts/borrow-lifecycle.md`. No unresolved Open Question blocks the
agreed F03–F05 API scope.

## Verification performed

| Command | Result | Notes |
| --- | --- | --- |
| `node .../bigin-verify-change/scripts/verify.mjs --dry-run` | Passed | Selected backend typecheck and frontend build from the changed paths. |
| `node .../bigin-verify-change/scripts/verify.mjs` | Passed | Backend typecheck and frontend production build passed. |
| `pnpm --filter backend build` | Passed | TypeScript build and alias rewrite passed. |
| `pnpm --filter backend test` | Passed | 35 unit tests passed. Coverage is Auth/RBAC/User/Asset service and middleware, not R1 Borrow/Approval/Fulfillment. |
| `pnpm --filter backend test:db` (2026-08-04) | Passed | 8 database integration tests passed; the Asset contract test covers create/update/catalog/retire/QR, validation, permissions and state transitions. |
| `pnpm --filter backend typecheck` (2026-08-04) | Passed | TypeScript source remains valid after changing the default role to `employee`. |
| `pnpm --filter backend build` (2026-08-04) | Passed | TypeScript build and alias rewrite passed. |
| `pnpm --filter backend test` (2026-08-04) | Passed | 35 unit tests passed, including the updated default-role tests. |
| `pnpm build:frontend` (2026-08-04) | Passed with warning | Production build passed; Vite still reports an existing oversized vendor chunk. |
| `pnpm --filter backend exec prisma migrate deploy` (2026-08-04) | Passed | Applied the Asset Issue permission and staff-to-employee role migrations. |
| `pnpm --filter backend exec prisma migrate status` (2026-08-04) | Passed | Prisma reports that the database schema is up to date. |
| `pnpm --filter backend test:db` (2026-08-04, Borrow lifecycle) | Passed | 8 database integration tests passed, including real HTTP coverage for request creation, review, approval, handover, normal return, history, and cancellation. See `docs/delivery/borrow-lifecycle-api-test-report.md`. |
| `pnpm --filter backend typecheck` (2026-08-04, Borrow lifecycle) | Passed | TypeScript validation passed after the Borrow lifecycle additions. |
| `pnpm --filter backend build` (2026-08-04, Borrow lifecycle) | Passed | Backend production TypeScript build passed after the Borrow lifecycle additions. |
| Manual browser verification (2026-08-04, Asset slice) | Passed | Asset Manager created asset 128, updated its serial, found it by server-generated QR, retired it, and created/updated a Brand. Test fixtures were removed afterward; a clean reload had no console messages. |
| `node .../bigin-verify-change/scripts/verify.mjs` (2026-08-05, F06/F07) | Passed | Backend typecheck and frontend production build passed for the complete dirty-worktree scope. |
| Manual browser verification (2026-08-05, F06/F07) | Passed with legacy-data discrepancy | Notification list/unread count loaded; opening one notification marked it read and changed badge 5→4; Asset Issue List/Detail and Reject modal rendered with live API data. Notification #35 referenced a deleted issue and safely showed unavailable state. |

No frontend automated test command exists in `apps/frontend/package.json`.
The production build is supplemented by the manual browser/API integration
evidence above; Vite still reports a non-blocking oversized-chunk warning.
