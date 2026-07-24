# BigIn Asset — Prompt tạo bộ giao diện bằng Google Stitch

> Mục tiêu: tạo một project Stitch thống nhất cho hệ thống quản lý và cho mượn
> thiết bị nội bộ BigIn. Tài liệu này dựa trên constitution/spec 00–06, source
> hiện tại và snapshot database chỉ đọc ngày 2026-07-22.

## 1. Cách dùng tài liệu này với Stitch

Stitch hỗ trợ tạo giao diện từ mô tả tự nhiên, duy trì ngữ cảnh trên canvas,
chỉnh sửa hội thoại và nối các screen thành prototype. Vì bộ giao diện này lớn,
không nên dán một prompt khổng lồ rồi yêu cầu tạo tất cả trong một lần.

1. Tạo một project Stitch mới tên **BigIn Asset Management**.
2. Nếu Stitch cho phép nhập design rules/DESIGN.md, đưa phần **Design system** của
   tài liệu này vào project trước.
3. Dán **Prompt 0 — Master context** một lần để thiết lập bối cảnh toàn project.
4. Chạy lần lượt Prompt 1 đến Prompt 7 trong cùng project. Không tạo project mới
   giữa các batch.
5. Sau mỗi batch, chọn screen tốt nhất rồi dùng các prompt refinement ở cuối file.
6. Nối các screen theo phần **Prototype flows** và kiểm tra lại bằng Play mode.

Nguồn tham khảo cách làm việc của Stitch:

- [Google Labs — Stitch AI-native design canvas](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/)
- [Google Developers — Generate UI from natural language and iterate](https://developers.googleblog.com/en/stitch-a-new-way-to-design-uis/)
- [Google Labs — DESIGN.md for Stitch](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/)

## 2. Nguồn sự thật và quyết định thiết kế

### 2.1 Nguồn được ưu tiên

1. `docs/architecture/constitution.md`
2. `docs/architecture/system-overview.md`
3. Module contract trong `docs/modules/`
4. Prisma schema và dữ liệu RBAC thực tế trong database
5. `docs/modules/auth/spec.md`, `docs/modules/users/spec.md` và các file
   `implementation.md` tương ứng cho contract/trạng thái đã triển khai gần nhất
6. Login/Register hiện tại làm mốc ngôn ngữ hình ảnh

### 2.2 Các điểm lệch phải biết trước khi dùng mockup

- Constitution và backend hiện cùng hỗ trợ self-register với role mặc định `staff`.
  Register tuyệt đối không có trường chọn role; admin tạo user và chọn role ở module Users.
- `docs/architecture/permission-registry.md` đã đồng bộ registry 50 code theo database. Gán/cập nhật role
  cho user dùng `role.assign`; không dùng các code cũ `user_role.*`/`role_permission.*`.
- Database có `borrow_request.cancel_own`, nhưng enum request chỉ có `pending`,
  `approved`, `rejected`; chưa có `cancelled`. UI có thể hiển thị xác nhận hủy cho
  đơn pending như một prototype state, nhưng không được tự bịa trạng thái thứ tư.
- Các quyết định chưa chốt trong spec được mockup theo hướng an toàn: QR sinh tự
  động sau khi lưu; ghi chú từ chối là bắt buộc; không cho mở hai repair log cùng
  lúc; mọi thao tác xóa đều có xác nhận và có disabled state khi đang được tham chiếu.

## 3. Snapshot database dùng cho mockup

Snapshot chỉ gồm lookup, tổng số và RBAC; không lấy tên, email, số điện thoại hay
mật khẩu của user.

### 3.1 Tổng quan dữ liệu

| Dữ liệu | Giá trị |
|---|---:|
| User | 6 |
| Role | 3 |
| Permission | 50 |
| Department | 3 |
| Asset | 8 |
| Borrow request | 4 |
| Repair đang mở | 1 |

Asset hiện tại:

| Trạng thái DB | Nhãn UI tiếng Việt | Số lượng |
|---|---|---:|
| `available` | Sẵn sàng | 4 |
| `borrowed` | Đang mượn | 2 |
| `damaged` | Hư hỏng | 1 |
| `in_repair` | Đang sửa | 1 |
| `retired` | Ngừng sử dụng | 0 (trạng thái target, cần migration) |

Borrow request hiện tại:

| Trạng thái DB | Nhãn UI tiếng Việt | Số lượng |
|---|---|---:|
| `pending` | Chờ duyệt | 1 |
| `approved` | Đã duyệt | 2 |
| `rejected` | Đã từ chối | 1 |

Lookup thật để dùng làm sample data:

- Department: `IT`, `Human Resources`, `Accounting`.
- Brand: `HP`, `Dell`, `Logitech`, `Lenovo`.
- Asset type: `Laptop`, `Monitor`, `Keyboard`, `Mouse`.
- Asset model:
  - HP ProBook 440 G9 — Laptop
  - Dell Latitude 5440 — Laptop
  - Dell P2422H — Monitor
  - Logitech K120 — Keyboard
  - Logitech M331 — Mouse
  - Lenovo ThinkPad E14 Gen 5 — Laptop

### 3.2 Role và permission thật

Ký hiệu gộp như `department.[view,create,update,delete]` dưới đây chỉ để tài liệu
ngắn hơn; database vẫn lưu từng permission code riêng, không có wildcard.

#### `admin` — 1 user, 50/50 permission

- `dashboard.view`
- `department.[view,create,update,delete]`
- `brand.[view,create,update,delete]`
- `asset_type.[view,create,update,delete]`
- `asset_model.[view,create,update,delete]`
- `asset.[view,create,update,delete,qr_generate,checkout,checkin]`
- `borrow_request.[create,view_own,view_all,update_own,cancel_own,approve,reject]`
- `borrow_history.[view_own,view_all]`
- `repair_log.[view,create,update,close]`
- `user.[view,create,update,delete]`
- `role.[view,create,update,delete,assign]`
- `permission.[view,create,update,delete]`

#### `staff` — 4 user, 10 permission

- `dashboard.view`
- `brand.view`
- `asset_type.view`
- `asset_model.view`
- `asset.view`
- `borrow_request.create`
- `borrow_request.view_own`
- `borrow_request.update_own`
- `borrow_request.cancel_own`
- `borrow_history.view_own`

Staff chỉ thấy dữ liệu và thao tác của chính mình. Staff không thấy quản trị user,
department, role, permission, duyệt đơn, sửa chữa hoặc CRUD thiết bị.

#### `asset_manager` — 1 user, 28 permission

- `dashboard.view`
- `brand.[view,create,update,delete]`
- `asset_type.[view,create,update,delete]`
- `asset_model.[view,create,update,delete]`
- `asset.[view,create,update,delete,qr_generate,checkout,checkin]`
- `borrow_request.[view_all,approve,reject]`
- `borrow_history.view_all`
- `repair_log.[view,create,update,close]`

Asset manager không thấy Users, Departments, Roles hoặc Permissions. Role này
không có quyền tạo yêu cầu mượn cá nhân trong snapshot hiện tại.

## 4. Information architecture theo permission

Không tạo hai bộ màn hình Asset tách biệt cho admin và employee. Dùng cùng một
screen/layout, sau đó tạo role variants với menu và actions khác nhau.

| Khu vực | Staff | Asset manager | Admin |
|---|:---:|:---:|:---:|
| Tổng quan | Có | Có | Có |
| Danh sách thiết bị | Xem + chọn mượn | CRUD + QR + check-in/out | Toàn quyền |
| Yêu cầu của tôi | Có | Không | Có |
| Hàng chờ duyệt | Không | Có | Có |
| Lịch sử mượn | Của tôi | Toàn bộ | Toàn bộ + của tôi |
| Sửa chữa | Không | Có | Có |
| Danh mục Brand/Type/Model | Chỉ đọc trong ngữ cảnh asset | Quản trị | Quản trị |
| Người dùng | Không | Không | Có |
| Phòng ban | Không | Không | Có |
| Vai trò & quyền | Không | Không | Có |

Navigation label tiếng Việt:

```text
Tổng quan
Thiết bị
Yêu cầu mượn
  - Yêu cầu của tôi
  - Chờ phê duyệt
Lịch sử mượn
Sửa chữa
Danh mục
  - Thương hiệu
  - Loại thiết bị
  - Model thiết bị
Quản trị
  - Người dùng
  - Phòng ban
  - Vai trò & quyền
```

## 5. Design system bắt buộc

### 5.1 Tính cách sản phẩm

- Work-focused enterprise UI cho hệ thống nội bộ, tin cậy, rõ ràng, hiệu quả.
- Không giống landing page marketing.
- Không dùng gradient, glassmorphism, neon, nền beige toàn trang, hero quá lớn,
  card lồng card hoặc card cho từng hàng dữ liệu trên desktop.
- Ưu tiên table/list, toolbar gần dữ liệu, form có chiều rộng giới hạn.
- Một primary action mạnh cho mỗi vùng; destructive action dùng wording rõ và xác nhận.

### 5.2 Token hình ảnh bám Login/Register hiện tại

```text
Brand / sidebar:          #173F3A
Primary action:           #246B59
Primary hover/focus:      #174D40
Secondary green:          #2D7463
Page background:          #F7F8FA
Panel background:         #FFFFFF
Subtle surface:           #F1F3F5
Primary text:             #182421
Secondary text:           #66736F
Default border:           #CBD5D1
Focus ring:               #2F6FEB at 30% alpha
Danger:                   #B42318
Success:                  #205C4D
Warning:                  #9A6700
Control radius:           7px
Panel radius:             10px maximum
Control height:           44–48px
Typography:               Inter, fallback system UI
Body size:                14–15px
Page title:               24–30px, never oversized
```

Status badge phải dùng text + icon/chấm + màu, không dùng màu làm tín hiệu duy nhất:

- Sẵn sàng: green.
- Đang mượn: blue.
- Hư hỏng: red.
- Đang sửa: amber.
- Chờ duyệt: amber.
- Đã duyệt: green.
- Đã từ chối: red.

### 5.3 Application shell

- Desktop 1440px: sidebar cố định khoảng 248px, header gọn 60–64px, content rộng
  theo tác vụ. Sidebar nền `#173F3A`, content nền `#F7F8FA`.
- Header có breadcrumb/page context, search chỉ khi thật sự hữu ích, user menu hiển
  thị tên + role, nút logout trong menu.
- Tablet: sidebar thu gọn thành rail hoặc drawer; toolbar được wrap theo nhóm.
- Mobile 390px: sidebar thành drawer; header giữ page title và primary action;
  table chuyển thành compact list có trường quan trọng, không ép toàn table thu nhỏ.
- Form desktop constrained 560–760px; list/table dùng content width lớn hơn.
- Dùng `100svh`, spacing linh hoạt và breakpoint có chủ đích; không detect thiết bị bằng JS.

### 5.4 Component language

Thiết kế nhất quán các component có thể chuyển thành Vue component sau này:

- `AppShell`, `AppSidebar`, `AppHeader`, `PageHeader`, `Breadcrumbs`.
- `BaseButton`, `IconButton`, `FormField`, `PasswordField`, `SelectField`.
- `DataTable`, `MobileRecordList`, `Toolbar`, `Pagination`.
- `StatusBadge`, `PermissionBadge`, `StatSummary`.
- `EmptyState`, `ErrorState`, `SkeletonRows`, `InlineAlert`, `Toast`.
- `ConfirmDialog`, `SideDrawer`, `DetailsList`, `Timeline`.
- `AssetPicker`, `PermissionMatrix`, `RoleSelector`.

Mọi component phải có hover, focus-visible, active, disabled, loading và error state.
Label form luôn hiện; placeholder không thay label. Tất cả icon-only button có tooltip
và accessible label. Không để loading/error làm thay đổi kích thước control.

## 6. Prompt 0 — Master context

Dán nguyên khối này vào Stitch trước các batch:

```text
Create a cohesive, high-fidelity, responsive web application design project named
“BigIn Asset Management”. This is an internal enterprise system for managing company
equipment, user access, borrowing and returns, and repairs. It is not a marketing site.
The implementation target is Vue 3 + Vite, so keep the design framework-neutral and
component-oriented. Do not assume React, Material UI, Tailwind, or a specific component
library. All end-user copy must be in natural Vietnamese; database permission codes may
remain in English inside technical admin screens.

Use one shared application shell and permission-driven variants instead of duplicating
separate admin and employee applications. A user can have multiple roles. Role names are
for identity and display; permission codes control navigation and actions. Hiding an action
is only UX—the server remains the security authority.

CURRENT ROLES FROM THE REAL DATABASE:
1. admin: 1 user, all 50 current permissions. It can access dashboard, departments,
   brands, asset types, asset models, assets, all borrowing flows, all borrow history,
   repairs, users, roles, role assignment, and permission CRUD.
2. staff: 4 users. It can view dashboard, brands, asset types, asset models and assets;
   create/view/update/cancel its own borrow requests; and view its own borrow history.
3. asset_manager: 1 user. It can manage brands, types, models and assets; generate QR,
   check assets in/out; view/approve/reject all borrow requests; view all history; and
   manage repair logs. It cannot access users, departments, roles or permissions.

CURRENT REALISTIC DATA:
- 6 users, 8 assets, 4 borrow requests, 1 open repair.
- Asset totals: 4 Sẵn sàng, 2 Đang mượn, 1 Hư hỏng, 1 Đang sửa.
- Request totals: 1 Chờ duyệt, 2 Đã duyệt, 1 Đã từ chối.
- Departments: IT, Human Resources, Accounting.
- Brands: HP, Dell, Logitech, Lenovo.
- Types: Laptop, Monitor, Keyboard, Mouse.
- Models: HP ProBook 440 G9, Dell Latitude 5440, Dell P2422H, Logitech K120,
  Logitech M331, Lenovo ThinkPad E14 Gen 5.
Use fictional Vietnamese names for sample users; never expose passwords or real identity data.

VISUAL DIRECTION:
- Trustworthy, compact, calm enterprise UI inspired by the existing BigIn login design.
- Dark green #173F3A sidebar, white panels, #F7F8FA page surface, primary action #246B59,
  text #182421, secondary text #66736F, border #CBD5D1, blue visible focus rings.
- Inter/system typography, 14–15px body, 24–30px page titles, 44–48px controls,
  7px control radius, maximum 10px panel radius.
- No gradients, glassmorphism, neon, oversized headings, decorative illustrations,
  nested cards, or generic dashboard filler.
- Use tables for comparable records on desktop and purpose-built compact lists on mobile.
- Use cards only for small KPI summaries, grouped tools, or genuinely repeated objects.
- Use status labels with text plus icon/dot, never color alone.

RESPONSIVE AND ACCESSIBLE BEHAVIOR:
- Desktop reference: 1440x1024 with a 248px persistent sidebar and compact top header.
- Tablet: collapsible navigation and wrapping toolbars.
- Mobile reference: 390x844 with a navigation drawer, sticky primary action when useful,
  single-column forms, and compact record lists rather than squeezed desktop tables.
- Use semantic form labels, visible keyboard focus, adequate contrast, 44px touch targets,
  logical focus order, concise validation, and stable loading states.
- Every data screen must have designed loading, empty, recoverable error, forbidden,
  pending mutation, success feedback, and long-content behavior. Show representative
  state variants without turning every state into a decorative full-page illustration.

BUSINESS STATE RULES:
- Asset statuses: Sẵn sàng (available), Đang mượn (borrowed), Hư hỏng (damaged),
  Đang sửa (in_repair), Ngừng sử dụng (retired). Do not expose an unrestricted status
  dropdown. Show only valid, contextual transitions.
- Valid asset transitions: available→borrowed; borrowed→available or damaged;
  available→damaged; damaged→in_repair; in_repair→available or damaged;
  available/damaged→retired. Retired is terminal.
- User accounts use active/inactive state through `is_active`; “delete user” means
  deactivate, not removing the database row.
- Borrow request statuses are only Chờ duyệt, Đã duyệt, Đã từ chối.
  Approve/reject is allowed only while pending. Approval is all-or-nothing if any selected
  asset is no longer available.
- Start repair only for a damaged asset. Finish repair with non-negative cost and a result
  of repaired or failed, producing available or damaged respectively. Do not allow multiple
  open repairs for one asset in the mockup.
- Destructive actions require confirmation. Asset retirement is disabled while borrowed
  or in repair; account deactivation must explain its session/access-token effect.

Create a coherent reusable design system across all screens. Preserve the same sidebar,
header, page headers, data density, form rhythm, table treatment, dialogs and status badges.
Label frames with stable IDs such as AUTH-01, AST-01 and BOR-01 so the prototype can be
reviewed and connected later.
```

## 7. Prompt 1 — Auth và dashboard theo role

```text
Continue in the existing BigIn Asset Management Stitch project and use the established
design system. Generate five high-fidelity desktop screens, with responsive mobile variants
for AUTH-01 and AUTH-02.

AUTH-01 — Login
- Preserve the current BigIn split auth layout: dark-green product context on the left,
  constrained white form on the right; collapse to a compact brand header on mobile.
- Fields: “Email” and “Mật khẩu”, show/hide password, primary button “Đăng nhập”.
- Do not use username. Do not include social login or SSO.
- Include variants for pending submit, generic invalid credentials, validation error,
  session expired, and server unavailable. Do not reveal whether the email exists.
- Optional secondary link: “Chưa có tài khoản? Đăng ký” only when self-registration is enabled.

AUTH-02 — Optional self-registration for the current implementation
- Use the same AuthLayout, slightly wider on desktop.
- Fields: Họ và tên, Email, Số điện thoại, Phòng ban select (IT, Human Resources,
  Accounting), Mật khẩu, Xác nhận mật khẩu.
- No username, no role selector, no admin checkbox. Explain subtly that a new account receives
  standard staff access. Role assignment is server-controlled.
- Include inline validation, duplicate email/phone error, invalid department error, pending
  submit and success state that returns to Login without automatically logging in.
- Mark this frame as OPTIONAL: it is removed if the team chooses admin-created accounts only.

DASH-01 — Staff dashboard
- Welcome header with fictional user name and role label “Nhân viên”.
- Focus on tasks, not analytics: quick action “Tạo yêu cầu mượn”, available asset count,
  current own borrowed items, pending own requests, expected return dates, and recent own history.
- Sidebar only shows Tổng quan, Thiết bị, Yêu cầu của tôi, Lịch sử của tôi.
- Do not show approval, repair, users, departments or RBAC.

DASH-02 — Asset manager dashboard
- Use the real aggregate snapshot: 8 assets with status breakdown 4/2/1/1, 1 pending request,
  1 open repair.
- Primary action is the most urgent operational task: “Xem yêu cầu chờ duyệt”.
- Show compact operational queues for pending approvals, damaged assets and open repairs.
- Sidebar shows Tổng quan, Thiết bị, Chờ phê duyệt, Lịch sử mượn, Sửa chữa, Danh mục.
- Do not show Users, Departments, Roles or Permissions.

DASH-03 — Admin dashboard
- Use real aggregate snapshot: 6 users, 8 assets, 1 pending request, 1 open repair.
- Provide compact links to Users, Departments and Roles & Permissions, while retaining all
  operational areas available to the asset manager.
- Include a concise asset status summary and latest operational activity; avoid decorative
  charts with no decision value.
- Sidebar shows every permitted area.

Across all dashboards, use the same AppShell. Do not create unrelated visual themes per role.
```

## 8. Prompt 2 — Quản lý thiết bị và danh mục

```text
Continue in the same BigIn Asset project. Generate five coherent screens for the Asset module.
Use the real brands, types, models and asset status totals. Reuse the same AppShell and status
components from the dashboards.

AST-01 — Shared asset catalog, staff variant
- Desktop table with columns: Mã/QR, Thiết bị, Model, Loại, Serial, Trạng thái.
- Toolbar: search by model/serial/QR, filters for type, brand and status, clear filters.
- Staff can open details and select only available assets for a borrow request.
- Primary action “Tạo yêu cầu mượn” becomes enabled after selecting available assets.
- No create, edit, delete, QR generation or status management controls.
- Provide a mobile compact-list variant preserving model, serial, status and selection.

AST-02 — Shared asset list, asset_manager/admin variant
- Same underlying list and visual hierarchy as AST-01, not a duplicated product.
- Add permission-controlled actions: Thêm thiết bị, Chỉnh sửa, Xem QR, Tạo lại QR,
  Ngừng sử dụng.
- Show bulk selection only for meaningful operations; do not add generic bulk actions.
- Disable “Ngừng sử dụng” for borrowed or in-repair assets and explain the reason in a tooltip.
- Retired rows are read-only, remain available to admin filters/history, and cannot return
  to an operational status.
- Include loading skeleton rows, empty filtered result and recoverable error variants.

AST-03 — Asset detail
- Header shows asset identity, model, serial and status with contextual primary action.
- Use description lists for core metadata, not many small cards.
- Sections/tabs: Tổng quan, Lịch sử mượn, Sửa chữa, QR.
- Show a scannable lifecycle timeline and related model/type/brand.
- Contextual transitions only: report damage when available, check in when borrowed,
  start repair when damaged, close repair through Repair flow when in_repair.
- Include a QR preview/print drawer state with accessible close and print actions.

AST-04 — Create/Edit asset form
- Constrained form with Model select grouped by brand/type, Serial number, and QR behavior.
- New asset defaults to Sẵn sàng. QR is generated automatically after successful save;
  do not ask the user to type a UUID manually.
- Editing does not expose an unrestricted status dropdown.
- Include duplicate serial/QR conflict, validation, unsaved changes confirmation, pending save,
  success toast and disabled submit states.

AST-05 — Catalog management
- One page with tabs: Thương hiệu, Loại thiết bị, Model thiết bị.
- Use compact tables and nearby create action; CRUD happens in a right-side drawer or focused dialog.
- Model form requires Brand, Loại and Tên model. Use real examples such as Dell Latitude 5440.
- Deletion is disabled when referenced by a model or asset, with a clear dependency message.
- Only asset_manager and admin variants may see edit/delete controls.
```

## 9. Prompt 3 — Luồng mượn của staff

```text
Continue in the same BigIn Asset project. Generate five staff-focused Borrowing screens.
Use only permissions available to the staff role and keep all copy in Vietnamese.

BOR-01 — Create borrow request
- A task-focused multi-asset request builder, reached from the asset catalog.
- Show selected available assets in a compact table/list. Each asset has its own required
  expected return date. Prevent duplicate assets.
- Allow removing an item and returning to the catalog to add more.
- Include a concise review summary before submit, then primary action “Gửi yêu cầu”.
- Include validation, asset-becomes-unavailable error, pending submit and success state.

BOR-02 — My requests
- Table/list limited to the current user's requests.
- Columns: Mã yêu cầu, Ngày tạo, Số thiết bị, Ngày trả gần nhất, Trạng thái, actions.
- Filters: status and date; search by request ID or asset model.
- Primary action “Tạo yêu cầu mượn”.
- Pending requests expose Edit; show Cancel only as a prototype action because the current
  status enum has no cancelled state. Do not invent a “Đã hủy” badge.

BOR-03 — Pending request detail
- Show requester summary, created date, status, list of assets and expected return dates.
- Staff may edit expected return dates or remove assets while pending.
- Show a focused cancel confirmation dialog explaining the current request is pending.
- Treat the result of cancel as an unresolved backend contract; do not create a fourth status.

BOR-04 — Terminal request detail
- Create approved and rejected variants using the same detail screen.
- Approved: read-only approval metadata, approver, approved time, active borrowed items and
  expected return dates.
- Rejected: read-only rejection note and approver metadata; offer “Tạo yêu cầu mới”, not edit.
- No approve/reject controls for staff.

BOR-05 — My borrow history
- Show active borrowed items first, then returned history.
- Fields: Asset, Serial, Ngày mượn, Ngày dự kiến trả, Ngày trả thực tế, Trạng thái.
- Highlight overdue semantics only as a non-color text label if data supports it; do not invent
  an overdue notification workflow.
- Provide a purposeful mobile list variant and useful empty state for a new staff account.
```

## 10. Prompt 4 — Phê duyệt, từ chối và trả thiết bị

```text
Continue in the same BigIn Asset project. Generate five operational screens for asset_manager
and admin. Staff must never see these controls.

BOR-06 — Approval queue
- Dense but readable table of all requests with tabs/filters for Chờ duyệt, Đã duyệt,
  Đã từ chối. Default to Chờ duyệt.
- Columns: Request ID, requester, department, created time, asset count, nearest expected
  return, status, action.
- Place “Xem xét” as the clear row action. Include loading, empty pending queue and error variants.

BOR-07 — Approval request detail
- Show requester and department, full asset list, current availability for every asset,
  expected return dates and optional note.
- Primary action “Phê duyệt”, secondary destructive action “Từ chối”.
- Before approval, visually re-check every asset. If any is no longer available, show a blocking
  inline error and disable approval; this operation is all-or-nothing, never partial approval.
- Once approved or rejected, make the screen read-only and remove mutation actions.

BOR-08 — Reject confirmation state
- Show a focused dialog over BOR-07.
- Require a rejection note in the mockup, display character guidance and clear consequences.
- Buttons: “Quay lại” and destructive “Xác nhận từ chối”. Include pending and error states.

BOR-09 — Check-in / return workflow
- Start from an approved request or borrowed asset.
- For each returning asset, require condition: “Tốt” or “Hư hỏng”.
- Good transitions borrowed→available; damaged transitions borrowed→damaged.
- Show current borrower, borrow date, expected date and serial to avoid checking in the wrong asset.
- Confirmation summarizes all status changes before submit; mutation is stable and prevents duplicates.

BOR-10 — All borrow history
- Asset_manager/admin table with filters for department, user, asset, date range and return state.
- Compare records using a table; use a details drawer for secondary metadata.
- Do not expose passwords, tokens or unrelated user security data.
- Add a mobile strategy with selected columns and a detail drawer, not horizontal micro-text.
```

## 11. Prompt 5 — Sửa chữa

```text
Continue in the same BigIn Asset project. Generate four high-fidelity Repair screens plus one
representative invalid-state variant. Only asset_manager and admin can access this module.

REP-01 — Repair list
- Tabs/filters: Đang sửa, Đã hoàn tất, Tất cả.
- Table fields: Repair ID, asset/model, serial, handler, start date, end date, cost, state.
- Primary action “Bắt đầu sửa chữa” is available only when choosing a damaged asset.
- Show the real aggregate context of one open repair without using fake charts.

REP-02 — Start repair
- Focused form/drawer from a damaged asset.
- Display immutable asset identity and current “Hư hỏng” status.
- Select handler from existing users, start date/time, optional note.
- Explain the resulting asset transition damaged→in_repair.
- Prevent starting a second open repair for the same asset; include validation and pending state.

REP-03 — Repair detail
- Use a description list plus chronological timeline.
- Show asset, handler, start/end, cost, notes and current asset status.
- While open, expose Edit and primary “Hoàn tất sửa chữa”. Closed records are read-only.
- Link back to Asset detail without duplicating asset information into many cards.

REP-04 — Close repair
- Form/drawer requiring non-negative cost, completion date/time, result “Sử dụng lại được”
  or “Vẫn hư hỏng”, and completion note.
- Result `repaired` transitions in_repair→available; `failed` transitions
  in_repair→damaged.
- Show a clear confirmation summary and pending/success/error states.

REP-05 — Invalid repair state
- Representative recoverable error: the asset is no longer damaged or already has an open repair.
- Preserve user-entered note when possible, explain why submission is blocked, and provide a
  direct action back to the current asset state. Avoid a decorative full-page error illustration.
```

## 12. Prompt 6 — Người dùng và phòng ban

```text
Continue in the same BigIn Asset project. Generate five admin-only screens for Users and
Departments. Use the real departments and roles. The User API target contract never exposes
password or password hash in list, detail or response UI.

USR-01 — Users list
- Table fields: Name, Email, Phone, Department, Roles, actions.
- Use fictional Vietnamese user identities while preserving real role counts as aggregate context:
  1 admin, 4 staff, 1 asset_manager.
- Filters for department and role; search by name/email/phone.
- Primary action “Thêm người dùng”. Permission-aware row actions: View, Edit,
  Ngừng tài khoản/Kích hoạt lại.
- Include loading rows, no-results, error and pagination states.

USR-02 — User detail
- Description list for identity/contact/department; role section with role badges and permissions
  summary; recent operational relationships only when useful.
- Never render password, password hash, JWT or refresh-token data.
- Primary action “Chỉnh sửa”; role management is available only through `role.assign`.
- Show active/inactive status. Deactivation keeps operational history, revokes refresh-token
  sessions, and warns that an existing access token may remain valid until expiry.

USR-03 — Create user
- Constrained admin form: Họ và tên, Email, Số điện thoại, Phòng ban, Mật khẩu,
  Xác nhận mật khẩu, Vai trò.
- Department options: IT, Human Resources, Accounting.
- Role options: admin, staff, asset_manager; require at least one role.
- Include duplicate email/phone, invalid department/role, validation, pending save and success.
- Make the high-impact admin role visually explicit but do not use fear-based styling.

USR-04 — Edit user
- Same component language as Create, prefilled; password field is optional and clearly separated.
- Manage the selected role set under the current `role.assign` capability. Do not create separate
  unsupported remove-role permission controls.
- Confirm risky role changes and explain that active access tokens may retain old permissions
  until refresh/expiry.
- Include unsaved changes confirmation and mutation error state.

DEP-01 — Departments
- Admin table for IT, Human Resources and Accounting with user counts and actions.
- Create/Edit in a focused dialog or drawer.
- Delete is disabled when users still reference the department; show the dependency count.
- Avoid a separate dashboard or decorative cards for three lookup rows.
```

## 13. Prompt 7 — RBAC, permission catalog và system states

```text
Continue in the same BigIn Asset project. Generate five admin-only/system screens. Preserve the
same dense enterprise style and real RBAC data. Permission codes are technical content and may
remain in English; labels and explanations are Vietnamese.

RBAC-01 — Roles list
- Show exactly three current roles: admin (1 user, 50 permissions), staff (4 users,
  10 permissions), asset_manager (1 user, 28 permissions).
- Table columns: Role, description, assigned users, permission count, actions.
- Actions follow role.view/create/update/delete; destructive delete is disabled while assigned.
- Include a Create/Edit role drawer for name and description, with duplicate-name error.

RBAC-02 — Role detail and permission matrix
- Header with role name, user count and permission count.
- Group the 50 permissions by Dashboard, Departments, Brands, Asset Types, Asset Models,
  Assets, Borrow Requests, Borrow History, Repairs, Users, Roles and Permissions.
- Provide search, expand/collapse groups and a clear read-only checked matrix for the selected role.
- Current database does not contain role_permission.assign/remove; therefore the default current-state
  design must not imply that saving matrix changes is authorized. Show an annotated prototype-only
  edit mode or disabled “Lưu phân quyền” state for future contract work.

RBAC-03 — Permission catalog
- Searchable/filterable table of 50 permissions with code, human name and module group.
- Admin actions follow permission.view/create/update/delete.
- Show usage count/roles using each permission before delete; block deletion while assigned.
- Technical codes use monospace only where helpful, not across the whole interface.

SYS-01 — Forbidden
- A restrained 403 page inside or adjacent to AppShell: “Bạn không có quyền truy cập”.
- Explain the missing permission in developer/admin detail only when appropriate; normal users see
  plain language. Provide “Quay lại” and “Về tổng quan”. Do not show inaccessible navigation items.

SYS-02 — Responsive mobile AppShell and global states
- Mobile 390x844 navigation drawer showing the staff menu as the default example.
- Include a compact header, visible current role, logout, route title and primary action.
- Also provide component-state specimens for skeleton table/list, empty state, retryable error,
  success toast, destructive confirmation, disabled control and session-expired dialog.
- Session expiry action returns to Login while preserving the intended redirect path.
```

## 14. Prototype flows cần nối trong Stitch

```text
Staff flow:
AUTH-01 Login
→ DASH-01 Staff dashboard
→ AST-01 Asset catalog
→ BOR-01 Create request
→ BOR-02 My requests
→ BOR-03/BOR-04 Request detail
→ BOR-05 My history

Asset manager flow:
AUTH-01 Login
→ DASH-02 Asset manager dashboard
→ BOR-06 Approval queue
→ BOR-07 Request detail
→ Approve OR BOR-08 Reject dialog
→ BOR-09 Check-in
→ AST-03 Damaged asset detail
→ REP-02 Start repair
→ REP-03 Repair detail
→ REP-04 Close repair

Admin flow:
AUTH-01 Login
→ DASH-03 Admin dashboard
→ USR-01 Users
→ USR-02 User detail
→ USR-03/USR-04 Create or edit user
→ DEP-01 Departments
→ RBAC-01 Roles
→ RBAC-02 Permission matrix
→ RBAC-03 Permission catalog
```

## 15. Prompt refinement sau khi đã tạo screen

### 15.1 Consistency pass

```text
Audit every screen in this BigIn Asset project for design-system consistency. Normalize sidebar,
header, page-title hierarchy, control height, form spacing, table density, status badges, dialog
width, focus rings and primary-action placement. Do not redesign the visual identity. Remove nested
cards, decorative gradients, oversized headings and duplicated navigation. Keep all Vietnamese copy
concise and use identical labels for identical actions across modules.
```

### 15.2 Permission pass

```text
Audit every role variant against the real permission matrix. Staff must never see approvals,
repairs, user administration, departments or RBAC. Asset_manager must never see Users, Departments,
Roles or Permissions. Admin may see all current modules. Hide inaccessible navigation and actions;
use a 403 screen only for direct URL access. Do not use role names as the authorization rule when a
permission code is available.
```

### 15.3 Responsive pass

```text
Create or refine mobile 390x844 and tablet variants for the primary flows. Replace desktop tables
with compact purposeful record lists on mobile, preserve primary actions and important status/date
information, move secondary metadata into drawers, and ensure no horizontal clipping. Keep touch
targets at least 44px and verify long Vietnamese labels, validation messages and fictional long names.
```

### 15.4 Accessibility and states pass

```text
Audit all screens for keyboard focus order, visible focus, contrast, labels, status semantics,
disabled explanations, destructive confirmations and non-color cues. Add stable loading skeletons,
empty states with relevant next actions, recoverable errors with Retry, pending mutation states that
prevent duplicate submission, success feedback, forbidden access and session-expiry handling.
Do not add decorative illustrations that compete with operational content.
```

## 16. Checklist nghiệm thu mockup

- [ ] Tất cả screen dùng cùng AppShell và design system.
- [ ] UI text là tiếng Việt; permission code giữ nguyên tiếng Anh ở màn hình kỹ thuật.
- [ ] Login dùng email, không dùng username.
- [ ] Register không cho chọn role và có thể bỏ độc lập nếu chốt admin-created account.
- [ ] Staff, asset_manager và admin có navigation/actions đúng database.
- [ ] Không có màn hình Asset riêng bị copy cho từng role; chỉ có permission variants.
- [ ] Trạng thái asset và borrow request không vượt state machine.
- [ ] Approve request là all-or-nothing.
- [ ] Return workflow yêu cầu tình trạng tốt/hỏng cho từng asset.
- [ ] Repair chỉ bắt đầu từ asset hỏng và kết thúc về available/damaged.
- [ ] User screens không bao giờ hiển thị password/hash/token.
- [ ] Permission matrix phản ánh 50 permission và ghi rõ giới hạn mapping hiện tại.
- [ ] Desktop dùng table/list đúng mục đích; mobile có compact-list strategy.
- [ ] Có loading, empty, error, forbidden, pending, success và destructive confirmation.
- [ ] Prototype nối đủ ba flow Staff, Asset manager và Admin.
