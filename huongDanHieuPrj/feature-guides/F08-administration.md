# F08 – Administration

## Bức tranh nghiệp vụ

User có permission quản trị có thể xem, tạo, cập nhật, activate/deactivate user và gán/gỡ role có sẵn. MVP không CRUD role hoặc permission code.

## Spec cần đọc trước

- [F08 feature](../../docs/mvp-requirements/06-features/F08-administration.md)
- [US-F08 stories](../../docs/mvp-requirements/07-user-stories/administration/)
- [RBAC Business Rules](../../docs/mvp-requirements/04-business-rules.md)
- [User management design](../../docs/plans/2026-08-04-user-management-design.md)

### Tóm tắt rule để đọc code

- Visibility/action dựa trên effective permission.
- Gán role chỉ chọn role đã tồn tại.
- Không có role inheritance.
- Deactivate giữ user và lịch sử, không xóa cứng.
- Role assignment có permission `role.assign`.

## Minimum Reading Path

1. [Users.vue](../../apps/frontend/src/views/admin/Users.vue) – `loadPage`, `changeStatus`.
2. [UserFormView.vue](../../apps/frontend/src/views/admin/UserFormView.vue) – `loadPage`, `toggleRole`, `submit`.
3. [user.routes.ts](../../apps/backend/src/routes/user.routes.ts) và [rbac.routes.ts](../../apps/backend/src/routes/rbac.routes.ts).
4. [user.service.ts](../../apps/backend/src/services/user.service.ts) và [rbac.service.ts](../../apps/backend/src/services/rbac.service.ts).
5. [user-api.integration.test.ts](../../apps/backend/tests/user-api.integration.test.ts) và [rbac.service.test.ts](../../apps/backend/tests/rbac.service.test.ts).

## User Story/action chính

- `US-F08-01` – Xem user list/detail.
- `US-F08-02` – Tạo user.
- `US-F08-03` – Cập nhật user.
- `US-F08-04` – Activate/deactivate user.
- `US-F08-05` – Gán/gỡ role có sẵn.

## Trace từng action

| User Story/action | Đường trace đầy đủ | Đọc |
|---|---|---|
| `US-F08-01` Xem user list/detail | `Users.vue:loadPage` hoặc `UserDetailView:loadUser` → `authStore.api` → `GET /api/users` hoặc `/api/users/:id` → `user.routes.ts` permission `user.view` → `UserController.getAll/getById` → `UserService.getAll/getById` → `PrismaUserRepository` → Prisma `User/UserRole/Department` → DB `users/user_roles/departments` → `user-api.integration.test.ts` | KỸ: permission/safe response; LƯỚT: filters |
| `US-F08-02` Tạo user | `UserFormView:submit` → `POST /api/users` → `user.routes.ts` permission `user.create` (+ role middleware nếu chọn role) → `UserController.create` → `UserService.create` → `PrismaUserRepository.create` + `RbacService.assignRoles` → Prisma `User/UserRole` → DB `users/user_roles` → user service/API tests | KỸ: employee default/password/role; LƯỚT: form CSS |
| `US-F08-03` Cập nhật user | `UserFormView:loadPage/submit` → `PATCH /api/users/:id` → `user.routes.ts` permission `user.update` → `UserController.update` → `UserService.update` → `PrismaUserRepository` + `RbacService.replaceUserRoles` → Prisma `User/UserRole` → DB `users/user_roles` → user service test | KỸ: partial update/role permission |
| `US-F08-04` Activate/deactivate | `Users.vue:changeStatus` hoặc `UserDetailView:changeStatus` → `PATCH /api/users/:id/activate` hoặc `DELETE /api/users/:id` → `user.routes.ts` permission `user.update`/`user.delete` → `UserController.activate/deactivate` → `UserService.activate/deactivate` → `PrismaUserRepository.setActive` + session revoke → Prisma `User/RefreshToken` → DB `users/refresh_tokens` → user API/service test | KỸ: không delete cứng |
| `US-F08-05` Gán/gỡ role | `UserFormView:toggleRole/submit` → `PUT /api/rbac/users/:userId/roles` → `rbac.routes.ts` permission `role.assign` → `RbacController.replaceUserRoles` → `RbacService.replaceUserRoles` → `PrismaRbacRepository.replaceUserRoles` → Prisma `UserRole/Role` → DB `user_roles/roles` → `rbac.service.test.ts` | KỸ: role set validation; LƯỚT: role option UI |

## SPEC EXPECTS

F08 cho phép quản lý user và role có sẵn; không cho CRUD role/permission. Public registration approval là F01-05, không phải user CRUD trực tiếp.

## CURRENT CODE

Users list/detail/form, avatar URL, active status và role assignment có code backend/frontend và integration/unit tests tương ứng.

## GAPS

- Delivery classification cũ có thể ghi F08 deferred/outside R1; code/test thực tế đã tồn tại nhưng frontend chưa có automated AC test đầy đủ.
- Không có registration review queue; xem gap tại [F01 guide](F01-authentication-access.md).
- Không đọc sâu các module CRUD role/permission vì đã out-of-scope MVP.
