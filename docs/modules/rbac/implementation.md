# Implementation — Flat RBAC

## 1. Trạng thái

**Core phase: đã triển khai.** Còn thiếu integration test HTTP và frontend quản trị
role hoàn chỉnh.

## 2. Thành phần đã triển khai

- `rbac.model.ts`
- `rbac.repository.ts`, `rbac.prisma.repository.ts`
- `rbac.service.ts`
- `rbac.controller.ts`, `rbac.routes.ts`
- `rbac.middleware.ts`
- Auth repository projection role/permission.
- Users/Auth gọi RbacService để gán role.

## 3. API đang hoạt động

- `GET /api/rbac/roles`
- `PUT /api/rbac/users/:userId/roles`

Cả hai yêu cầu `requireAuth` và `role.assign`.

## 4. Data thực tế

- Schema có `roles`, `permissions`, `role_permissions`, `user_roles`.
- Permission code runtime được làm phẳng vào access token.
- Hệ thống hỗ trợ nhiều role trên một user.

## 5. Kiểm thử hiện tại

- UserService tests bao phủ một phần default/explicit role assignment.
- Chưa có test HTTP riêng cho RBAC 403 và invalid role.

## 6. Quyết định AS-BUILT

- Flat RBAC, không có role hierarchy.
- Không có wildcard permission.
- Middleware kiểm permission trong JWT, không query DB mỗi request.
- Đổi role không lập tức thay permission của access token đang tồn tại.

## 7. Phần còn thiếu

- HTTP integration tests.
- Frontend role-management flow đầy đủ.
- CRUD role/permission và role-permission mapping cố ý nằm ngoài scope.
