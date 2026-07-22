# 04 — Quản trị RBAC (Roles & Permissions)

> Phần QUẢN TRỊ phân quyền (CRUD role/permission, gán role cho user).
> Phần ENFORCE (kiểm quyền trên route) nằm ở `rbac.middleware` — hạ tầng, không thuộc module này.

## 1. Goals
- CRUD roles, permissions.
- Gán/bỏ permission cho role (`role_permissions`).
- Gán/bỏ role cho user (`user_roles`).
- Cung cấp cách tra "user X có permission code Y không" cho `rbac.middleware` dùng.

## 2. Non-goals
- Không verify JWT (module 01 / auth.middleware).
- Không định nghĩa route-level guard (đó là rbac.middleware — hạ tầng).

## 3. Data model (Prisma, đã có)
- `roles`: id, name (unique).
- `permissions`: id, name, code (unique).
- `role_permissions`: (role_id, permission_id) — khóa chính kép.
- `user_roles`: (user_id, role_id) — khóa chính kép.

## 4. Constraints
- Quyền được kiểm theo `permissions.code`, KHÔNG theo role name.
- Không xóa role/permission đang được gán (hoặc phải gỡ gán trước — chốt ở câu hỏi mở).

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0401: The system shall xác định quyền của user bằng tập hợp `permissions.code` suy ra từ các role của user.

### Event-driven
- REQ-0410: When admin gán permission cho role, the system shall tạo bản ghi `role_permissions` (bỏ qua nếu đã tồn tại — idempotent).
- REQ-0411: When admin gán role cho user, the system shall tạo bản ghi `user_roles` (idempotent).
- REQ-0412: When admin tạo role/permission trùng `name`/`code`, the system shall từ chối và báo trùng.
- REQ-0413: When admin gỡ role khỏi user, the system shall xóa bản ghi `user_roles` tương ứng.

### Unwanted behavior
- REQ-0430: If gán role/permission không tồn tại, then the system shall từ chối.
- REQ-0431: If `rbac.middleware` kiểm mà user thiếu permission code yêu cầu, then the system shall trả lỗi 403.

## 6. Events emitted
(không có ở bản này)

## 7. Câu hỏi mở
- [ ] Xóa role đang gán cho user: chặn, hay tự gỡ gán rồi xóa?
- [ ] Có role "super admin" bỏ qua mọi check permission không?
- [ ] Cache tập permission của user (hiệu năng) hay query mỗi request?
