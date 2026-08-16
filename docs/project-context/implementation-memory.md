# Implementation Memory

Đây là technical memory có chọn lọc, không phải changelog. Chỉ ghi thông tin có
giá trị lâu dài cho việc đọc, triển khai và debug project.

## Architecture Decisions

- Transaction boundary follows one-owner/participant: each multi-write use case
  opens exactly one Prisma transaction in its coordinating service. Called
  services expose explicit `InTransaction` methods and pass the same client to
  repositories; repositories never open write transactions themselves.
  Read-only list/count batching may still use a repository-local transaction.
- The current transaction owners are `BorrowRequestService` (create request),
  `BorrowWorkflowService` (approval, handover, return and withdrawal),
  `AssetIssueService` (issue/repair actions), `RbacService`, `UserService`,
  `RegistrationService`, `AssetService` (asset code allocation), `AuthService`
  (refresh rotation), and `VendorService` (vendor update/status). Borrow and
  Asset Issue repositories do not write each other's tables; cross-module
  writes go through participant services with the owner transaction.
- Authorization dựa trên effective permission, không hard-code role name.
- Một user có thể có nhiều role; effective permissions là union permission của các role.
- Flat RBAC: Admin không tự động inherit Manager nếu chưa được gán permission.
- Approval không đồng nghĩa với Handover.
- Asset chỉ chuyển sang `BORROWED` khi handover thực tế được xác nhận.
- Approval workflow chỉ chịu trách nhiệm duyệt và giữ chỗ; fulfillment workflow
  mới chịu trách nhiệm bàn giao và nhận trả.
- Approval Queue và Fulfillment Queue dùng queue API và permission độc lập:
  handover dùng `asset.checkout`, return dùng `asset.checkin`; không yêu cầu
  `borrow_request.view_all` hoặc `borrow_history.view_all` cho hai queue vận hành.
- Không cache trạng thái queue ở frontend; queue phải phản ánh trạng thái mới
  nhất sau các thao tác cạnh tranh hoặc xử lý từ người dùng khác.
- Asset `RESERVED` có thể được giải phóng khi request được thu hồi hợp lệ trước handover.
- `borrow_histories` là nguồn xác định handover/return thực tế trong MVP.
- Normal return cập nhật history và asset state trong cùng workflow transaction.
- Report Issue tạo `REPORTED` và chưa tự đổi asset sang `DAMAGED`.
- Confirm Issue mới chuyển issue sang `CONFIRMED` và asset sang `DAMAGED`.
- Repair thất bại không tự chuyển asset sang `RETIRED`.
- QR dùng để identify/lookup asset, không phải nghiệp vụ inventory/stocktake.
- `qr_code` immutable sau khi tạo asset; QR image chứa frontend URL `/qr/{qr_code}`. Camera lifecycle thuộc Asset QR Scan screen, không thuộc Asset List. Không có permission riêng cho việc regenerate QR; màn hình chỉ render/in mã immutable hiện có.
- `department_id` là organizational ownership, không phải location.
- Inventory/stocktake không thuộc MVP.
- Future design nằm trong [`../future/`](../future/) và không được tự implement.
- `users.user_code` là định danh nghiệp vụ immutable theo format `BI[YY][Sequence]`; `YY` là năm account được cấp mã lần đầu theo `Asia/Ho_Chi_Minh`, sequence riêng theo năm và không tái sử dụng.
- User legacy được backfill năm 2026 theo `users.id ASC`; bảng `user_code_sequences` giữ sequence cuối để user mới tiếp tục đúng chuỗi. User code không được dùng làm PK/FK.
- Migration backfill dùng temporary staging table có primary key vì database runtime bật `sql_require_primary_key`.

### 2026-08-12 — Authenticated workspace theme/token architecture

**Feature:** Frontend design system and dark mode.

**Decision:** Light remains the default reference theme and dark is an explicit
user preference persisted in `localStorage.theme`. The frontend owns a shared
semantic token layer in `apps/frontend/src/assets/tokens.css` with light and
dark scopes; authenticated views consume surface, text, border, icon and
semantic status roles instead of hard-coded neutral colors. Ant Design Vue's
`ConfigProvider` uses the matching default/dark algorithm and maps its layout,
container, elevated, text, border, inset, hover and selected tokens to the
same contract.

**Reason:** A single semantic source keeps the BigIn primary action and status
meaning stable while allowing panels, tables, forms, overlays and navigation to
adapt to dark surfaces. Explicit persistence prevents the operating system
from unexpectedly overriding a user's choice.

**Affected areas:** `apps/frontend/src/assets`, `App.vue`, app store, workspace
shell, authenticated dashboard/administration, asset, borrowing, issue and
notification views, and design-system documentation. Login/register and
training/legacy routes remain outside this migration. Authentication routes are
explicitly light-only; the persisted preference is restored when the user
returns to the authenticated workspace.

**Verification:** Frontend production build, static audit for business-view
neutral hard-codes and `prefers-color-scheme` conflicts, plus manual light/dark
checks for shell, tables, forms, overlays, status colors, focus, hover,
disabled and loading states.

## Important Business/Technical Gotchas

- Asset code là định danh bất biến độc lập với QR: create atomically cấp
  `normalized_prefix + sequence` bằng row lock `asset_code_sequences`; đổi tên
  type chỉ đổi prefix cho asset tạo sau, còn prefix cũ giữ sequence để không tái sử dụng mã.

- Approve All có thể partial success; detail không giữ được asset không tự chuyển `REJECTED`.
- Cancel/withdraw request bị chặn nếu request đã có actual handover history; không chỉ dựa trên current asset status.
- `received_by` là người có quyền tiếp nhận asset khi trả, không phải employee mượn.
- `asset_issues.status = REPORTED` chưa đủ để kết luận asset đã hỏng.
- State transition cần được kiểm tra trong service và transaction, không chỉ ở UI.
- HTTP `409` dành cho state/concurrency conflict theo contract hiện tại.
- Notification recipient được xác định theo permission/entity, không hard-code role name.
- F06 current permission namespace is `asset_issue.report/view/create/update/close`; legacy `repair_log.*` is not a runtime permission.
- Confirm Issue accepts only a `REPORTED` issue whose asset is `AVAILABLE` or `BORROWED`; it does not broaden to `RESERVED`, `IN_REPAIR` or `RETIRED`.
- Damaged Return is one F05/F06 transaction: history is returned with `DAMAGED`, asset becomes `DAMAGED`, a `CONFIRMED` issue is created, and the response includes its `issueId`.

## Deployment Gotchas

- Backend production cần chạy Prisma generate trước build khi generated client không được commit.
- Backend phải bind vào `process.env.PORT` để platform như Render nhận diện port.
- Frontend deployment cần cấu hình SPA fallback để refresh deep link không trả 404.
- Session restore ở initial navigation có thể chờ backend; cần phân biệt loading, expired session và backend unavailable.

Các ghi chú deployment trên chỉ là context; khi sửa phải kiểm tra log/config thực tế.

## Current Known Gaps

### Evidence, accessory và acknowledgement chưa có trong MVP schema

- **Gap:** Chưa có attachment/media, accessory checklist, receipt hoặc electronic acknowledgement cho handover/return/repair.
- **Feature:** F05/F06; future scope xem [`../future/scale-system.md`](../future/scale-system.md).
- **Evidence:** [`schema.prisma`](../../apps/backend/prisma/schema.prisma) hiện chỉ có lifecycle fields trong `borrow_histories` và repair fields trong `asset_issues`.
- **Impact:** Cần requirement và migration riêng nếu mở rộng ITAM evidence.
- **Status:** Future candidate; không implement từ future docs.

## Important Recent Decisions

### 2026-08-16 — Future image evidence dùng private AWS S3 và CloudFront

**Feature:** Future Phase 1 Image Evidence Core.

**Decision:** Binary evidence sẽ nằm trong private AWS S3 bucket; CloudFront với
Origin Access Control (OAC) cung cấp public `GET`/`HEAD` URL. Vue chỉ nhận
presigned PUT từ BigIn API để upload trực tiếp lên S3; xác nhận object, link
metadata và delete vẫn qua backend. Không dùng presigned GET, CloudFront signed
URL hoặc storage credential ở frontend. Deployment ưu tiên IAM role/task role;
AWS access key env chỉ dành cho local development.

**Reason:** Giữ S3 private và không mở public bucket/ACL, đồng thời đáp ứng
roadmap cần stable public media URL cho evidence và kiểm soát mutation qua API.

**Affected areas:** `docs/future/scale-phases/`, `apps/backend/.env.example`,
future storage implementation contract.

**Verification:** Đối chiếu README, Phase 0/1/3/5, roadmap index và env mẫu;
`git diff --check`; không triển khai code, Prisma, API hoặc AWS resource trong
task này.

### 2026-08-14 — Tách permission quản lý status cho User, Vendor và Department

**Feature:** F08 Administration và Shared Vendor/Department master data.

**Decision:** `*.update` chỉ sửa thông tin. `user.manage_status`,
`vendor.manage_status` và `department.manage_status` là capability riêng cho
cả bật và tắt `isActive`; không có DELETE API cho ba resource này. Asset giữ
`asset.delete` cho nghiệp vụ Retire. `role.delete` không có API/lifecycle và bị
loại khỏi permission catalogue.

**Migration:** Dùng expand/contract. Giai đoạn expand thêm ba permission và
backfill `role_permissions` từ các grant legacy thực tế, không theo role name.
Giai đoạn contract xóa các permission legacy khỏi catalogue và role grants.
Token cũ cần login/refresh lại để nhận capability mới.

**Department rule:** Department inactive vẫn giữ user/asset/history links nhưng
không được dùng cho assignment mới. Backend kiểm tra active state ở user,
registration approval và asset assignment; frontend chỉ đưa department active
vào selector, ngoại lệ là department hiện tại của bản ghi đang sửa.

**Affected areas:** Prisma schema/migrations, User/Vendor/Department routes,
RBAC essential-admin guard, assignment repositories, Administration frontend,
OpenAPI/contracts/requirements and tests.

### 2026-08-14 — Shared vendor master for repair provider

**Feature:** Vendor Management / F06 Asset Issues & Repair.

**Decision:** Replace free-text `asset_issues.repair_provider` with nullable
`asset_issues.vendor_id` referencing a shared `vendors` master. Vendor lifecycle
uses active/deactivate only; the application never deletes vendor records so
historical issues remain valid and resolve the current vendor name without a
snapshot in this phase. Legacy data uses an expand/backfill/contract migration
so old instances can be drained before the destructive column drop.

Repair mutations distinguish omitted `vendorId` (preserve, repair permission
only) from number/null (assign or clear, both repair permission and
`vendor.view`). Assign/deactivate/update serialize on a vendor row via
`SELECT ... FOR UPDATE`; inactive vendors cannot be assigned to new repairs.
The one-time compatibility grant selects roles from actual existing
repair-mutation permission assignments; it is not runtime permission
inheritance.

### 2026-08-13 — Shared responsive workspace contract

**Feature:** Active frontend responsive behavior.

**Decision:** The authenticated workspace uses `<576px`, `576–991px`, and
`>=992px` breakpoints. Below 992px the permission-aware sidebar is a
closed-by-default overlay drawer sized `min(296px, 82vw)`, with a backdrop,
Escape/route-close behavior, dynamic viewport sizing, and body scroll lock.
Data-dense Ant tables own their horizontal scrolling through
`x: 'max-content'`; the shared wrapper never owns a second horizontal scroll.
Approval Detail keeps its custom 960px header and rows inside one scroll
container with identical grid columns.

**Reason:** This preserves desktop density while preventing page-level overflow
and table/header desynchronization on phones and tablets. The drawer width
leaves a visible backdrop rather than covering an entire phone screen.

**Affected areas:** Shared frontend CSS/tokens, workspace shell, active
workspace views, Registration Requests toolbar, and the responsive static audit.

**Verification:** `pnpm build:frontend`,
`node apps/frontend/scripts/responsive-static-audit.mjs` (41 checks),
`git diff --check -- apps/frontend`, and responsive runtime overflow smoke
checks. Realtime/polling was not added; the registration queue refresh remains
an explicit API re-fetch.

### 2026-08-13 — Tách Approval Queue khỏi Fulfillment Queue

**Feature:** F04/F05.

**Decision:** Approval Queue chỉ approve/reject. Màn `Handover & Return` giữ một
route với hai tab `Pending Handover` và `Pending Return`; mỗi tab có read API và
permission vận hành riêng, còn các mutation handover/return hiện tại được giữ
nguyên. Approval Detail chỉ điều hướng sang tab handover khi user có
`asset.checkout`.

**Reason:** Tách rõ quyết định giữ chỗ khỏi việc bàn giao/nhận trả thực tế,
giảm việc một queue gọi endpoint vượt permission và làm thứ tự xử lý vận hành
minh bạch hơn.

**Affected areas:** Borrow lifecycle repository/service/controller/routes,
frontend fulfillment and approval views, API contracts and navigation/screen
specification.

**Verification:** Backend typecheck and borrow lifecycle integration coverage;
frontend production build; queue API ordering, permission and state-transition
checks.

### 2026-08-11 — Registration requests tách khỏi users và guard essential admin theo permission

**Feature:** F01/F08 Registration Review and RBAC Management.

**Decision:** Guest submission tạo `registration_requests(PENDING)`, không tạo inactive user. Nullable unique pending email/phone keys bảo vệ concurrency và được clear cùng password hash ở approve/reject. Approve khóa request và tạo user/userCode/department/initial roles/link trong một transaction. Role management hỗ trợ list/detail/create/custom rename/permission replace-set; không delete role hoặc permission CRUD.

Sensitive role-permission, user-role và user-deactivation mutations khóa tập permission thiết yếu cố định rồi kiểm tra còn ít nhất một active user có effective union đầy đủ. Guard không dùng tên role. Permission changes có hiệu lực ở access token được cấp ở login/refresh tiếp theo.

**Gotcha:** Prisma CLI trước đây dùng `DATABASE_URL` trong khi runtime adapter dùng `DB_HOST/DB_NAME`, làm migration có thể chạy nhầm datasource. `prisma.config.ts` hiện dựng URL từ cùng bộ `DB_*`, fallback về `DATABASE_URL` chỉ khi runtime fields không đủ.

**Affected areas:** Prisma schema/migration, Registration/RBAC/User services and routes, Administration Vue screens, OpenAPI/contracts/requirements, integration tests and Stitch screens.

**Verification:** Backend typecheck/unit tests, registration/RBAC DB integration including concurrent duplicate submission and atomic hash cleanup, frontend build, OpenAPI parse, Stitch queue/detail generation.

### 2026-08-10 — Gom active-status thành một API PATCH (superseded)

**Feature:** F08 Administration.

**Decision:** Dùng `PATCH /api/users/:userId/status` với body `isActive: boolean` cho cả kích hoạt
và vô hiệu hóa. Quyền legacy `user.update`/`user.delete` đã được thay bằng
`user.manage_status` cho cả hai chiều; không dùng DELETE cho nghiệp vụ đổi trạng thái.

**Reason:** Một API thống nhất nhưng vẫn giữ được phân quyền khác nhau cho hai hành động.

**Affected areas:** User routes/controller/service, User Management frontend, OpenAPI/API catalog và
integration test.

**Verification:** Backend typecheck/unit tests và frontend build; integration test có coverage cho
status PATCH và permission mismatch.

### 2026-08-09 — Chuẩn hóa permission F06 và tích hợp Damaged Return

**Feature:** F05/F06/RBAC.

**Decision:** Thay hoàn toàn runtime permission `repair_log.*` bằng `asset_issue.*` trong migration,
route, service, frontend và tests; migration giữ permission ID/role assignment khi có thể. Damaged
Return dùng một transaction để cập nhật history, asset, confirmed issue và notifications, trả `issueId`.

**Reason:** Giữ capability-based authorization nhất quán và không để trạng thái trả/asset/issue lệch nhau.

**Affected areas:** `apps/backend`, `apps/frontend`, `docs/contracts`, permission registry, F06 guide.

**Verification:** Backend typecheck; integration coverage cho reject, fail repair và damaged return.

### 2026-08-09 — Tách future design khỏi MVP

**Feature:** Project documentation.

**Decision:** Tài liệu ITAM mở rộng nằm trong `docs/future/`, đánh dấu `FUTURE / NOT IMPLEMENTED`,
và không được dùng để tự động sửa requirement, contract, schema hoặc code MVP.

**Reason:** Tránh future behavior âm thầm trở thành scope hiện tại.

**Affected areas:** `docs/future/`, workflow trong `AGENTS.md`.

**Verification:** Kiểm tra tree và git diff chỉ chứa documentation.

### 2026-08-09 — Manager/Admin có thể sở hữu capability IT operations

**Feature:** F05/F06/RBAC.

**Decision:** Chưa cần role IT Support riêng; quyền được cấp bằng effective permissions. Có thể
thêm role sau mà không hard-code role vào business logic.

**Reason:** Giữ business actor trung lập và phù hợp flat RBAC hiện tại.

**Affected areas:** Permission assignment, F05/F06 authorization, future scale design.

**Verification:** Đối chiếu với actor fields tham chiếu `users` và nguyên tắc permission-based access.

### 2026-08-09 — Borrowing Purpose là bắt buộc

**Feature:** F03 Borrow Request.

**Decision:** `borrow_requests.note` (Borrowing Purpose) phải là chuỗi sau khi trim,
từ 1 đến 300 ký tự. Frontend validate để phản hồi sớm; backend Zod schema là
biên bảo vệ bắt buộc; database giữ cột `NOT NULL`. Migration backfill các request
legacy chưa có purpose bằng nhãn minh bạch trước khi đổi nullability.

**Reason:** Dấu bắt buộc trên form phải khớp với API contract và dữ liệu persisted,
không cho phép request mới được tạo với purpose rỗng.

**Affected areas:** F03 requirements/contracts, borrow request form/controller/DTO,
Prisma schema and migration, integration validation coverage.
