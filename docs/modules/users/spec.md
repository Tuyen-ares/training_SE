# 03 — Người dùng & phòng ban (Users & Departments)

> Aggregate root: `users`. Module nền, làm sớm vì nhiều module trỏ tới `users`.
>
> Loại tài liệu: **Spec** — mô tả WHAT/WHY, phạm vi và tiêu chí chấp nhận.
> Thiết kế triển khai nằm ở [`plan.md`](plan.md); trạng thái code nằm ở
> [`implementation.md`](implementation.md).

## 1. Goals
- CRUD người dùng (do admin quản lý) và phòng ban.
- Đảm bảo email/phone duy nhất; hash password khi tạo/đổi.
- Cho phép admin chọn role ban đầu khi tạo user, nếu admin có quyền `role.assign`.

## 2. Non-goals
- Không xử lý login/token (module 01).
- Không quản lý CRUD role/permission (module 04).
- Không tự ghi trực tiếp bảng `user_roles`; việc gán role thuộc RBAC và phải đi qua
  `RbacService`.

## 3. Data model (Prisma, đã có)
- `users`: id, department_id, name, password (bcrypt), email (unique), phone
  (unique), `is_active` (default `true`).
- `departments`: id, name (unique).

Không dùng `deleted_at`. Migration
`20260723160000_add_user_is_active` bổ sung
`users.is_active Boolean @default(true)`.

## 4. Constraints
- `email` và `phone` duy nhất.
- Password luôn hash bcrypt trước khi lưu; không bao giờ trả password ra response.
- Không xóa department còn user thuộc về.
- Khi admin tạo user có danh sách role, Users tạo bản ghi `users`, sau đó gọi
  `RbacService.assignRoles(userId, roleIds, tx)` trong cùng Prisma interactive
  transaction. Tạo user và gán role phải cùng thành công hoặc cùng rollback.
- Nếu admin không chọn role, hệ thống gán role mặc định `staff`.
- User không bị xóa vật lý. Thao tác ngừng tài khoản đặt `is_active=false`; query
  người dùng đang hoạt động và login chỉ nhận `is_active=true`.
- Endpoint/action được bảo vệ bởi `user.delete` nhưng semantics là deactivate, không
  phải SQL delete. Admin có thể kích hoạt lại bằng luồng update phù hợp.
- Email/phone của user không hoạt động vẫn được giữ unique để bảo toàn định danh lịch sử.
- Khi ngừng tài khoản, Users gọi Auth service revoke toàn bộ refresh-token family của
  user. Access token đã cấp có thể còn hiệu lực tối đa 15 phút; đây là trade-off đã
  chấp nhận của cơ chế JWT không query DB mỗi request, không phải cơ chế khóa khẩn cấp.

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0301: The system shall hash password bằng bcrypt trước khi lưu.
- REQ-0302: The system shall không bao giờ trả trường `password` trong bất kỳ response nào.
- REQ-0303: The system shall loại user có `is_active=false` khỏi query người dùng
  đang hoạt động; màn hình quản trị có thể lọc để xem tài khoản đã ngừng.

### Event-driven
- REQ-0310: When admin tạo user với email hoặc phone đã tồn tại, the system shall từ chối và báo trùng.
- REQ-0311: When admin tạo user, the system shall gán `department_id` hợp lệ (phòng ban tồn tại).
- REQ-0312: When admin đổi password của user, the system shall hash lại giá trị mới trước khi lưu.
- REQ-0313: When admin tạo user và chọn role hợp lệ, the system shall tạo user và gán
  các role đó thông qua RBAC; response không trả password/hash.
- REQ-0314: When admin tạo user nhưng không chọn role, the system shall gán role mặc định `staff`.
- REQ-0315: When admin ngừng/xóa user hợp lệ, the system shall đặt
  `is_active=false`, giữ nguyên dữ liệu lịch sử và revoke toàn bộ refresh-token
  family của user.

### Unwanted behavior
- REQ-0330: If `department_id` không tồn tại, then the system shall từ chối tạo/sửa user.
- REQ-0331: If xóa department còn user tham chiếu, then the system shall từ chối.
- REQ-0332: If admin chọn role không tồn tại, then the system shall từ chối tạo user
  hoặc rollback toàn bộ thao tác tạo user + gán role.
- REQ-0333: If user có `is_active=false` đăng nhập hoặc refresh token, then the system
  shall từ chối bằng lỗi xác thực chung.

## 6. Events emitted
(không có ở bản này)

## 7. Câu hỏi mở

- [x] Xóa user là xóa cứng hay soft-delete?
  => Không xóa row. Dùng `is_active=false` để ngừng tài khoản và giữ lịch sử.
- [ ] User tự đổi thông tin cá nhân được không, hay chỉ admin?
