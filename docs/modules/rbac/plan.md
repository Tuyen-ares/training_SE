# Plan — Flat RBAC

> Input: [`spec.md`](spec.md). Giai đoạn hiện tại chỉ quản lý việc gán/thay thế
> role của user và cung cấp permission; không CRUD role/permission.

## 1. Phạm vi

- Đọc role options hợp lệ.
- Gán/thay toàn bộ tập role của một user.
- Cung cấp permission codes cho Auth tạo access token.
- Enforce permission bằng middleware đọc `req.auth.permissionCodes`.
- Hỗ trợ Users/Auth gán role ban đầu trong transaction.

## 2. Kiến trúc và ownership

```text
RBAC routes → RbacController → RbacService → IRbacRepository → Prisma
AuthService → AuthRepository (read roles/permissions for login)
protected route → requireAuth → requirePermission(code)
```

- RBAC sở hữu ghi `user_roles`.
- `role_permissions` chỉ được seed/migrate ở giai đoạn hiện tại.
- Auth có thể query projection quyền phục vụ login nhưng không thay đổi mapping.
- FE dùng role để hiển thị danh tính/variant; dùng permission để menu/action.

## 3. API contract

| Method | Endpoint | Permission | Mục đích |
|---|---|---|---|
| GET | `/api/rbac/roles` | `role.assign` | Role options khi tạo/sửa user |
| PUT | `/api/rbac/users/:userId/roles` | `role.assign` | Thay toàn bộ role |

Không có endpoint CRUD role, permission hoặc role-permission trong phase này.

## 4. Data

- `roles.name` unique.
- `permissions.code` unique.
- `user_roles` và `role_permissions` dùng composite primary key.
- Registry trong architecture là source mã quyền ở design time.
- Database là runtime assignment và phải được seed/migrate khớp registry.

## 5. Luồng nghiệp vụ

### Replace roles

1. Validate user ID và danh sách role không rỗng.
2. Loại ID trùng.
3. Kiểm tra tất cả role tồn tại.
4. Trong một transaction, xóa mapping cũ và tạo tập mapping mới.
5. Cùng tập role gửi lại phải idempotent.

### Authorization

1. `requireAuth` verify access token và đặt `req.auth`.
2. `requirePermission(code)` kiểm code trong Set.
3. Thiếu quyền trả 403; thiếu identity trả 401.

## 6. Validation, security và errors

- Không tin role/permission do client tự khai.
- Route cần code cụ thể; không wildcard.
- FE ẩn menu không thay thế middleware.
- Đổi role không sửa access token đã cấp; quyền mới có hiệu lực lúc refresh/login lại.
- Payload role IDs sai hoặc rỗng trả bad request; role/user không tồn tại trả lỗi phù hợp.

## 7. Test strategy

- Unit RbacService: empty, duplicate, invalid, idempotent.
- HTTP integration: 401, 403, invalid user/role, success.
- Transaction integration: lỗi giữa replace phải rollback.
- Auth integration: token mới chứa permission mới sau refresh/login.

## 8. Thứ tự triển khai

1. Permission registry + seed/migration.
2. Repository contract/implementation.
3. RbacService.
4. Controller/routes.
5. `rbac.middleware`.
6. Tích hợp Users/Auth.
7. Tests và FE role selector.

## 9. Không làm

- Không verify JWT trong RBAC.
- Không sửa hồ sơ user.
- Không CRUD role/permission.
- Không chỉnh `role_permissions` qua API.
- Không thêm super-admin bypass trước khi spec chốt.
- Không query database ở mỗi request chỉ để kiểm permission.
