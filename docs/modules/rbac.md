# 04 — Flat RBAC và gán role

> Role và permission là dữ liệu hệ thống cố định trong giai đoạn hiện tại.
> Module chỉ quản lý việc gán/thay đổi role của user và cung cấp dữ liệu quyền.
> Phần ENFORCE (kiểm quyền trên route) nằm ở `rbac.middleware` — hạ tầng, không thuộc module này.

## 1. Goals

- Gán hoặc thay thế tập role của user (`user_roles`), ví dụ chuyển
  `staff → asset_manager` hoặc `asset_manager → staff`.
- Cung cấp cách tra "user X có permission code Y không" cho `rbac.middleware` dùng.
- Cung cấp service nội bộ cho module Users/Auth gán role mặc định hoặc role do admin chọn
  sau khi user được tạo.

## 2. Non-goals

- Không verify JWT (module 01 / auth.middleware).
- Không định nghĩa route-level guard (đó là rbac.middleware — hạ tầng).
- Không tạo/sửa thông tin user như name/email/phone/password; dữ liệu đó thuộc module Users.
- Chưa cung cấp API CRUD role hoặc permission.
- Chưa cho phép thay đổi `role_permissions` qua API. Quan hệ role–permission được
  quản lý bằng seed/migration trong giai đoạn hiện tại.

## 3. Data model (Prisma, đã có)

- `roles`: id, name (unique).
- `permissions`: id, name, code (unique).
- `role_permissions`: (role_id, permission_id) — khóa chính kép.
- `user_roles`: (user_id, role_id) — khóa chính kép.

## 4. Constraints

- Quyền được kiểm theo `permissions.code`, KHÔNG theo role name.
- Các role hiện hành là `admin`, `staff`, `asset_manager`; không cho client tự tạo
  role name mới.
- [`permission-registry.md`](../architecture/permission-registry.md) là registry mã
  quyền được ứng dụng hỗ trợ; bảng
  `permissions` là bản runtime được seed/migrate từ registry đó.
- Thêm/đổi/xóa một permission code phải cập nhật đồng thời registry, constant dùng
  chung trong backend/frontend và migration/seed. Không tạo code chỉ tồn tại trong
  DB nhưng không có route/use case sử dụng.
- Thay đổi role của user phải yêu cầu permission `role.assign`.
- Tập role mới phải có ít nhất một role hợp lệ. Thao tác thay thế phải được thực
  hiện nguyên tử để user không rơi vào trạng thái gán dở.
- `user_roles` là dữ liệu thuộc RBAC. Module khác muốn gán role phải gọi `RbacService`,
  không tự gọi repository/table `user_roles`.

## 5. Acceptance Criteria (EARS)

### Ubiquitous

- REQ-0401: The system shall xác định quyền của user bằng tập hợp `permissions.code` suy ra từ các role của user.
- REQ-0402: The system shall dùng mã quyền trong permission registry làm contract
  và đảm bảo dữ liệu seed/migration của bảng `permissions` khớp contract đó.

### Event-driven

- REQ-0410: When admin có `role.assign` thay đổi tập role của user, the system
  shall thay thế các bản ghi `user_roles` trong một transaction.
- REQ-0411: When cùng tập role được gửi lại, the system shall xử lý idempotent và
  không tạo bản ghi trùng.
- REQ-0412: When role của user thay đổi, the system shall dùng tập permission mới
  khi access token được refresh hoặc cấp lại.
- REQ-0413: When module Users/Auth yêu cầu gán role mặc định hoặc role ban đầu cho user,
  the system shall validate role tồn tại và ghi `user_roles` qua RBAC service.

### Unwanted behavior

- REQ-0430: If tập role rỗng hoặc chứa role không tồn tại, then the system shall từ chối.
- REQ-0431: If `rbac.middleware` kiểm mà user thiếu permission code yêu cầu, then the system shall trả lỗi 403.
- REQ-0432: If service/module khác tự ghi trực tiếp `user_roles` mà không qua RBAC service,
  then implementation shall be rejected in review.
- REQ-0433: If người gọi thiếu `role.assign`, then the system shall không thay đổi
  role của user và trả lỗi 403.

## 6. Events emitted

(không có ở bản này)

## 7. Permission code registry

- Danh sách chuẩn hiện hành:
  [`permission-registry.md`](../architecture/permission-registry.md).
- Runtime authorization đọc quyền đã gán từ bảng `permissions`; spec registry trả
  lời câu hỏi “ứng dụng hỗ trợ những code nào”. Hai vai trò khác nhau, không mâu thuẫn.
- Route, menu và action phải tham chiếu cùng một code trong registry. FE ẩn/disable
  action chỉ để UX; backend middleware vẫn là nơi quyết định cho phép cuối cùng.
- Không hỗ trợ wildcard như `asset.*`; mỗi code được lưu và kiểm riêng.

## 8. Trạng thái triển khai hiện tại

Đã triển khai:

- [x] Schema `roles`, `permissions`, `role_permissions`, `user_roles`.
- [x] Login truy vấn role và làm phẳng `permissions.code`.
- [x] Access token chứa `permissionCodes`.
- [x] `requirePermission(code)` bảo vệ các route hiện có.

Chưa triển khai:

- [ ] `RbacService` và repository dành riêng cho việc thay thế role của user.
- [ ] API admin thay đổi role của user với permission `role.assign`.
- [ ] Users/Auth gọi `RbacService` khi gán role ban đầu hoặc role mặc định.
- [ ] Transaction thay thế tập `user_roles`.
- [ ] Tách `requirePermission` khỏi `auth.middleware.ts` sang `rbac.middleware.ts`.
- [ ] Automated test cho gán role, role không tồn tại và lỗi 403.

CRUD role/permission và chỉnh `role_permissions` không phải đầu việc đang chờ;
chúng nằm ngoài phạm vi giai đoạn hiện tại.

## 9. Câu hỏi mở

- [ ] Có role "super admin" bỏ qua mọi check permission không?
- [x] Cache tập permission của user (hiệu năng) hay query mỗi request?
=> Theo hướng access token chứa `permissionCodes`. `rbac.middleware` kiểm quyền từ JWT,
không query DB mỗi request.
Trade-off: nhanh và đơn giản, nhưng khi đổi quyền trong DB thì access token cũ vẫn giữ
quyền cũ cho tới khi token refresh/expiry.
