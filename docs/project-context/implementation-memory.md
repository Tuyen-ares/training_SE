# Implementation Memory

## 2026-08-21 — Notification delivery durability (implemented and verified)

- The durable target remains transactional domain events, observer-produced
  intents, atomic delivery materialization, and channel handlers in the same
  Node.js process as Express. FCM/SMS remain outside active scope.
- RabbitMQ is an optional delivery transport for notification_deliveries only.
  DISABLED keeps the database delivery loops, MISCONFIGURED stops delivery
  processing without automatic fallback, and READY runs channel-specific
  publisher/consumer sessions. Domain events still use outbox_events.
  Publisher claims use PUBLISHING leases and confirm plus basic.return checks;
  consumers CAS to PROCESSING and increment attempt_count once. The database
  remains the source of truth and IN_APP remains the logical channel for any
  future Firebase realtime transport.
- Delivery rows use `outbound_message_id` for the optional ID assigned by
  BigIn before provider I/O; EMAIL uses it as the stable SMTP Message-ID.
  `provider_message_id` keeps the provider result after sending. The generic
  pair avoids future `teams_message_id` columns. Delivery `event_id` remains
  a logical outbox reference so the two tables can be retained independently.
- Runtime, dispatcher and handlers now depend on repository contracts. Typed
  Zod-validated events map all 14 event types to three observers; recipient and
  template resolution precede atomic delivery materialization. A Map registry
  selects atomic in-app and structured-message SMTP handlers without channel branches
  in the generic processor. Borrow and asset-issue events carry compact business
  snapshots (names, request/detail or issue IDs, asset identity, dates, reasons,
  conditions and repair fields) created inside the business transaction. The
  `borrow_request.approval_summary` event is the single notification boundary for
  Approve All; successful detail audit events are suppressed from notification,
  skipped details remain pending, and an all-skipped action emits no summary.
  Notification materialization creates one notification_messages row per event with
  the event_type snapshot, template_version and compact JSON render payload;
  notification_deliveries references it through nullable message_id for legacy
  compatibility and no longer stores an HTML body column. The SMTP handler renders
  English branded HTML at send time; deliveries without structured message payload
  are rebuilt from their title/text snapshots. User input is escaped, links use
  APP_PUBLIC_URL, and display times use Asia/Ho_Chi_Minh while persisted timestamps
  remain UTC.
- Claim/finalize/retry operations require status and lease ownership. Outbox
  and delivery repositories select due IDs with `FOR UPDATE SKIP LOCKED`, bulk
  update each claimed batch, and read the claims in one transaction. Runtime
  uses recursive loops, bounded channel concurrency and one shared DB limiter.
- SMTP configuration is `DISABLED`, `MISCONFIGURED`, or `READY`. Disabled SMTP
  produces terminal skips, misconfiguration leaves backlog pending without an
  email loop, and ready SMTP reuses one pooled transporter. Sanitized runtime
  errors redact authorization, secret key/value and URL credentials. Persisted
  timestamps remain UTC; the SMTP RFC `Date` header is formatted at send time
  with `Asia/Ho_Chi_Minh` (`+0700`) so mailbox metadata follows Vietnam time.
- Verification: backend typecheck/build, 90 unit tests, 14 MariaDB integration
  tests (including bulk claim/lease/materialization/reclaim and lifecycle event
  counts), verify-change dry/full runs, and the selected frontend production
  build passed. A new API-created delivery was observed through
  `PENDING -> PROCESSING -> SENT` with a stored provider message ID. Direct
  mailbox receipt remains a manual gate; SMTP delivery stays at-least-once.
- Detailed gap state and command evidence live in
  `docs/plans/2026-08-21-notification-outbox-remediation-checklist.md`.

Đây là technical memory có chọn lọc, không phải changelog. Chỉ ghi thông tin có
giá trị lâu dài cho việc đọc, triển khai và debug project.

## Architecture Decisions

### 2026-08-16 — Chuẩn hóa ownership của frontend source

Production views và services được nhóm theo domain trong các thư mục boilerplate
cấp cao hiện có của `apps/frontend/src`. Các view training được tách sang
`training/frontend-vue/{examples,components}` và không được production import.
Việc chuẩn hóa chỉ thay đổi filesystem/import path; route URL/name/meta/guard,
service exports, Axios/session behavior và API contract được giữ nguyên.

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
- `qr_code` immutable sau khi tạo asset; QR image chứa frontend URL `/qr/{qr_code}` và helper lấy origin từ trang đang chạy, nên local/preview/production tự dùng đúng origin mà không cần switch thủ công. Camera lifecycle thuộc Asset QR Scan screen, không thuộc Asset List. Không có permission riêng cho việc regenerate QR; màn hình chỉ render/in mã immutable hiện có.
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

### Accessory và acknowledgement chưa có trong MVP schema

- **Gap:** Accessory checklist, receipt và electronic acknowledgement chưa có trong MVP.
- **Feature:** F05/F06; future scope xem [`../future/scale-system.md`](../future/scale-system.md).
- **Evidence:** Image media/evidence hiện đã có trong `media_files`, các typed evidence table và primary-image FK; gap này không còn bao gồm media.
- **Impact:** Accessory và acknowledgement vẫn cần requirement và migration riêng nếu mở rộng ITAM.
- **Status:** Future candidate; không implement từ future docs.

## Important Recent Decisions

### 2026-08-19 — Shared AppTable foundation and progressive table reduction

**Feature:** Active authenticated frontend list/table consistency.

**Decision:** Production list/table screens use the shared Vue
`components/common/AppTable.vue` foundation. It owns Ant Design table spacing,
typography, loading/empty rendering, server/client pagination footer, mobile
stacked-row slot support, touch targets and intentional-scroll behavior. Action
columns use the shared semantic `compact`/`normal`/`wide` widths and the title
`Action`; `fixed="right"` is only used on tables that intentionally scroll.

Columns reduce width by grouping descriptive metadata into the primary cell;
fields used for filtering, sorting or frequent cross-row comparison remain
separate. `scroll.x = 'max-content'` is not a page default. Pages opt into the
foundation's intentional mode only when comparison/workflow context cannot be
preserved through grouping; otherwise the table is allowed to flex or renders
a stacked mobile row. No API, permission or business behavior changed.

Screen-specific exceptions are explicit: Asset List keeps Category, Brand and
Serial Number as separate columns and does not render QR metadata; Asset Detail
keeps QR out of the descriptions and exposes it through the Asset QR action;
Borrowing Activity and
Handover/Return also omit QR from their Asset cells; My Borrow Requests keeps
the Created timestamp separate; Vendor keeps contact and address fields as
separate management columns and uses intentional table scroll.

**Reason:** The previous per-page table wrappers, padding values and pagination
patterns caused inconsistent density and unnecessary horizontal scrolling. A
single presentation boundary keeps responsive and accessibility behavior
consistent without moving domain rendering or permission logic into a generic
component.

**Affected areas:** `AppTable`, table tokens/responsive CSS, Asset, Borrowing,
Issue, Vendor and Administration list views, and the responsive static audit.

**Verification:** Frontend production build, responsive static audit and
`git diff --check`; runtime viewport inspection remains part of the UI handoff.

### 2026-08-20 — Canonical Asset Identity presentation

**Feature:** Asset identity consistency across inventory, borrowing, approval,
handover/return, history, dashboard and issue screens.

**Decision:** Frontend renderers normalize asset responses to one canonical
shape: `modelName`, `assetCode`, `serialNumber` and optional `imageUrl`.
Shared formatters and `AssetIdentity.vue` render the ordered presentation
`Model`, `Code`, `Seri`; missing values use `—`. QR is reserved for scan,
lookup, generation/drawer and other explicit QR interactions, and is never a
textual identity fallback. Asset List intentionally keeps Category, Brand and
Serial Number as separate comparison columns, so its Asset cell shows only
Model and Code. Asset Detail retains its dedicated metadata fields and does
not add a duplicate identity block. Dashboard keeps its existing columns and
only normalizes the values within them.

**Contract:** Borrow lifecycle read mappers and Asset Issue read projection
add `assetCode` only where the backend previously discarded it. Existing
`qrCode` fields, routes, permissions, database schema and business behavior
remain unchanged.

**Affected areas:** Asset identity normalizer/formatters, shared identity
component, asset and borrowing renderers, dashboard and issue renderers,
borrow/issue DTO mappers, OpenAPI and related contract documentation.

**Verification:** Backend typecheck/build and unit tests, frontend production
build, responsive static audit, runtime checks for desktop with persistent
sidebar, tablet drawer, mobile stacked rows and `git diff --check`.

### 2026-08-20 — Full-width list surfaces and intentional table scroll

**Decision:** Authenticated list/table screens use the available workspace
content width instead of a centered page cap that leaves large desktop gutters.
Page padding remains the responsive gutter. `AppTable` keeps its responsive
default; `max-content` scrolling is opt-in only for genuinely data-dense
tables whose important comparison fields or workflow actions cannot fit.

**Reason:** A centered `max-width` on list screens reduced the usable table
surface on wide laptop/desktop viewports, while broad use of intentional
scroll made modest tables feel unnecessarily difficult to scan. Full-width
list surfaces preserve the table foundation without hiding data.

**Affected areas:** Administration, catalog, issue, borrowing, vendor and
notification list shells, plus the modest-width Users, Registration Requests,
Approval Queue, My Borrow Requests and Asset Issues tables that now use the
default responsive table mode. Asset List, Vendor, Handover/Return and other
genuinely dense tables retain intentional scroll where required.

**Verification:** Runtime width/overflow checks at 1920×1080 and 1280×800,
frontend production build, responsive static audit and `git diff --check`.

### 2026-08-18 — Active S3/CloudFront media and evidence core

**Feature:** F02 asset images, F05 handover/return evidence, F06 successful
repair evidence and F08 user avatars.

**Decision:** Media objects are private S3 objects read through CloudFront with
OAC. The backend creates UUID-based immutable storage keys, persists a
`PENDING` row, signs a direct PUT with `Content-Type`, immutable `Cache-Control`
and `If-None-Match: *`, then moves the row to `READY` only after an exact
`HeadObject` metadata check. The browser never receives AWS credentials or
presigned GET URLs.

Business linking uses typed evidence tables and `assets.image_media_id` /
`users.avatar_media_id`. A conditional `linked_at IS NULL` claim, the typed
relation or FK update, and the owning business mutation share one Prisma
transaction. Cross-purpose validation therefore belongs to the business
linking use case, not Complete.

**Operational gotchas:** a successful PUT followed by transient Complete
failure retries the same media ID; a failed PUT or conditional `412` gets a
new media ID/key. HeadObject failures keep the row `PENDING` and do not trigger
automatic deletion; metadata mismatch performs best-effort DeleteObject but
also keeps the row for cleanup. Manual cleanup distinguishes stale PENDING,
never-linked READY and detached replacements, locks/rechecks typed references,
and never uses ListBucket. Legacy `image_url`/`avatar_url` remain fallback read
paths.

**Affected areas:** media config/storage adapter, Prisma migration, media API,
borrow/repair/asset/user services, Vue uploader, read models, cleanup/audit
commands, active requirements and API contracts.

**Verification:** Prisma validate, backend typecheck/build/unit tests,
frontend production build, OpenAPI YAML parse, repository verification script
and `git diff --check`. AWS S3/CloudFront smoke testing remains a deployment
gate requiring the real configured infrastructure.

### 2026-08-20 — Native capture and race-safe media compensation

**Decision:** Avatar/asset remain immediate single-image uploads with separate
native capture and library inputs. Handover, normal/damaged return and successful
Complete Repair keep up to ten processed images locally and upload the full
batch sequentially only on Confirm. Shared orchestration tracks every media ID,
compensates unlinked attempts after upload/business failures, never blindly
deletes a 412 collision key and requires reconciliation after linked or unknown
cleanup outcomes. `Complete` means READY, not linked; only the committed
business claim establishes `linked_at` and its typed/FK relation.

**Cancel hardening:** `MediaService` owns a Prisma transaction with 2-second
max wait and 8-second timeout. `PrismaMediaRepository` locks and rechecks the
media row and all relations; DeleteObject uses a 5-second AWS abort signal while
the row lock is held. Delete/storage/transaction timeout returns retryable
`MEDIA_STORAGE_UNAVAILABLE` and DB rollback preserves the row. S3 and DB remain
non-atomic, so timeout cleanup is explicitly unknown and clients must not infer
deletion. Logs include media ID, phase and error code only.

**Operational gotcha:** stale PENDING/never-linked READY cleanup remains a
manual command fallback. No scheduler or worker currently runs it automatically.

**Verification:** Frontend unit/component/state-machine tests, frontend build,
backend media cancel unit tests, backend typecheck/build/tests, OpenAPI parse and
repository diff checks. Native camera preview/device lifecycle and MIME/
orientation behavior still require real iOS/Android device coverage.

### 2026-08-20 — Shared native camera preview and lease coordination

**Decision:** Replace the browser capture-file hint with one shared native
`getUserMedia` preview modal for avatar, asset image and evidence capture. A
global camera session coordinator grants one lease to `media-capture` or
`qr-scanner`; owner teardown owns hardware/resource cleanup, while `release`
only performs token-checked bookkeeping. Coordinator `forceStop` is the only
preemption path and waits for pending startup before releasing. Page lifecycle,
camera switching and unexpected track-ended events use this same path.

**Cleanup retry gotcha:** A failed owner teardown must retain both its tokenized
lease and stream candidate. Only an in-flight cleanup promise is deduplicated;
after rejection, later cleanup may retry. The coordinator releases the lease
only after teardown succeeds and pending `getUserMedia` settles, while stale
streams returned after preemption are stopped immediately.

**Review rule:** Successful frame encoding stops tracks, clears
`video.srcObject`, releases the lease and only then enters review. Review keeps
only a local File/object URL. Retake acquires a new lease before
`getUserMedia`; failed acquisition/readiness preserves the review. Mirroring is
derived from actual track `facingMode` settings and applies only to CSS preview;
canvas output is never mirrored.

**Verification:** Frontend tests cover lease idempotency, pending startup,
review/retake ordering, actual-facing mirroring, track-ended cleanup, modal
actions, QR lease lifecycle and existing upload/evidence regression behavior.
Real iPhone Safari, Android Chrome and desktop camera/permission/busy/device
switch checks remain required because jsdom cannot validate hardware behavior.

### 2026-08-16 — Future image evidence proposal (superseded)

**Status:** Historical future proposal; superseded by the active 2026-08-18
media implementation above.

**Decision:** Binary evidence sẽ nằm trong private AWS S3 bucket; CloudFront với
Origin Access Control (OAC) cung cấp public `GET`/`HEAD` URL. Vue chỉ nhận
presigned PUT từ BigIn API để upload trực tiếp lên S3; xác nhận object, link
metadata và delete vẫn qua backend. Không dùng presigned GET, CloudFront signed
URL hoặc storage credential ở frontend. Deployment ưu tiên IAM role/task role;
AWS access key env chỉ dành cho local development.

**Reason:** Giữ S3 private và không mở public bucket/ACL, đồng thời đáp ứng
roadmap cần stable public media URL cho evidence và kiểm soát mutation qua API.

**Affected areas:** The original future design in `docs/future/scale-phases/`
and the now-active storage implementation contract.

**Verification:** The proposal was originally checked against the roadmap;
implementation is now verified by the active media checks above.

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
Before the shared table foundation migration, data-dense Ant tables owned
their horizontal scrolling through `x: 'max-content'`; the shared wrapper
never owned a second horizontal scroll. The active list/table behavior is now
refined by the 2026-08-19 `AppTable` decision: no page-default horizontal
scroll, with intentional scroll only where grouping cannot preserve context.
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

### 2026-08-26 — Request-level grouping for fulfillment queues

**Feature:** F05 Handover & Return.

**Decision:** Giữ Handover & Return là màn hình fulfillment riêng với hai tab và
permission độc lập, nhưng đổi read model của cả hai queue từ detail/history
phẳng sang group cấp borrow request. Queue chỉ hiển thị summary/count và điều
hướng vào detail tương ứng: Handover Detail dùng
`GET /borrow-request-details/handover-queue/:requestId`, Return Detail dùng
`GET /borrow-histories/return-queue/:requestId`. Hai detail page giữ mutation
từng asset/history để admin/manager kiểm tra, chụp evidence tùy chọn và confirm.
Không thêm bulk handover/return trong MVP; evidence vẫn claim theo từng history.

**Reason:** Approval Queue đã làm rõ context request; cùng một request không nên
bị chia thành nhiều dòng vận hành, đồng thời checkout/checkin vẫn cần thao tác
độc lập trên từng asset/history.

**Affected areas:** Borrow lifecycle DTO/repository/service/controller/routes,
Handover/Return Queue and Handover/Return Detail Vue views/services, Approval
Detail deep-link, OpenAPI, API/lifecycle/frontend contracts and
integration/component tests.

**Verification:** Backend typecheck, focused workflow/lifecycle tests, frontend
production build, responsive static audit, repository verification selector and
git diff check.

### 2026-08-26 — Request-level grouping and standard table surface for Borrowing Activity

**Feature:** F05 Borrowing Activity.

**Decision:** Giữ hai tab Currently Borrowed và Returned History, nhưng đổi
read model từ history phẳng sang request group và hiển thị bằng shared
`AppTable`: một dòng chính cho mỗi borrow request, có title cột chuẩn và một
bảng con expandable cho các asset history matching tab. Pagination/total tính
theo borrow request; child histories chỉ gồm state đang chọn và được xếp theo
detailId. Không thêm status ở cấp group vì status canonical vẫn thuộc asset và
được xem trong History/Asset Detail. Giữ nguyên các API asset-level hiện tại để
không phá dashboard; Borrowing Activity dùng endpoint grouped riêng với
borrow_history.view_own hoặc borrow_history.view_all.

**Reason:** Một request là giỏ nghiệp vụ chứa nhiều asset detail. Grouping giữ
context request liền mạch, tránh lặp requester/request date và tránh một
request bị tách qua nhiều trang. Dùng cùng table foundation với Approval Queue
và fulfillment queue giữ title, density, pagination và responsive behavior đồng
nhất; child rows chỉ mở khi cần nên không làm danh sách chính quá dài.

**Affected areas:** Borrowing Activity Vue view/test, active frontend screen and
flow specifications, F05 user stories, grouped read model/API contracts,
OpenAPI/API catalog and implementation memory. Không có database migration.

**Verification:** Frontend component tests, production build, responsive static
audit, grouped backend lifecycle integration coverage, OpenAPI contract checks
and repository verification selector.
### 2026-08-26 — Approval Queue `ALL` filter

**Feature:** F04 Approval & Reservation.

**Decision:** Không thêm endpoint mới. Mở rộng query của
`GET /borrow-request-details/review-queue` với `approvalStatus`, giữ
`PENDING` làm mặc định và bổ sung `ALL`. Khi chọn `ALL`, API phân trang
server-side theo hai nhóm: request có ít nhất một detail `PENDING` trước,
sau đó là request không còn `PENDING`; mỗi nhóm vẫn oldest-first.

**Reason:** Reviewer có thể xem cả lịch sử trong cùng queue mà không tải toàn
bộ dữ liệu về client, đồng thời quy tắc vận hành Pending-first vẫn được giữ.

**Affected areas:** Review queue controller/model/repository, Approval Queue
Vue view and component/integration tests, OpenAPI, API catalog, lifecycle
contract, user story, use case and frontend flow/screen specifications.

**Verification:** Backend typecheck and review-queue integration coverage;
frontend component tests, production build and responsive static audit.

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
