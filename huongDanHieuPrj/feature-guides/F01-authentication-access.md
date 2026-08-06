# F01 – Authentication & Access

## Bức tranh nghiệp vụ

User phải đăng nhập bằng tài khoản active, nhận session, truy cập các route theo effective permissions và có thể refresh/logout. Public registration theo spec mới phải tạo request `PENDING`, nhưng branch hiện tại vẫn có registration trực tiếp cũ.

## Spec cần đọc trước

- [F01 feature](../../docs/mvp-requirements/06-features/F01-authentication-access.md)
- [Business Rules AUTH/RBAC](../../docs/mvp-requirements/04-business-rules.md)
- [US-F01 stories](../../docs/mvp-requirements/07-user-stories/authentication-access/)
- [API catalog – Auth](../../docs/contracts/api-catalog.md)

### Tóm tắt rule để đọc code

- Chỉ user active được login.
- Refresh token phải hợp lệ, chưa dùng, chưa revoke và chưa hết hạn.
- Logout phải revoke khả năng refresh.
- Route bảo vệ bằng permission code, không hard-code role name.
- Registration đúng spec phải tạo request pending, chưa tạo session.

## Minimum Reading Path

1. [Login.vue](../../apps/frontend/src/views/login/Login.vue) – `submit`.
2. [stores/auth.js](../../apps/frontend/src/stores/auth.js) – `login`, `performRefresh`, `restoreSession`, `api`, `logout`.
3. [auth.routes.ts](../../apps/backend/src/routes/auth.routes.ts).
4. [auth.service.ts](../../apps/backend/src/services/auth.service.ts) – `login`, `refresh`, `logout`.
5. [schema.prisma](../../apps/backend/prisma/schema.prisma) – `users`, `refresh_tokens`, `user_roles`.

## User Story/action chính

- `US-F01-01` – Login.
- `US-F01-02` – Refresh session.
- `US-F01-03` – Logout.
- `US-F01-04` – Access by effective permission.
- `US-F01-05` – Registration review (spec có, branch hiện tại còn gap).

## Trace từng action

| User Story/action | Đường trace đầy đủ | Đọc |
|---|---|---|
| `US-F01-01` Login | `Login.vue:submit` → `auth.js:login` → `POST /api/auth/login` → `auth.routes.ts` (`public`) → `AuthController.handleLogin` → `AuthService.login` → `PrismaAuthRepository.findUserByEmail` → Prisma `User/Role/Permission/RefreshToken` → DB `users/user_roles/role_permissions/permissions/refresh_tokens` → `auth.service.test.ts` | KỸ: service; LƯỚT: controller/repository; BỎ QUA: style |
| `US-F01-02` Refresh | `auth.js:performRefresh/refresh/restoreSession/api` → `POST /api/auth/refresh` → `auth.routes.ts` (`public`, token bắt buộc) → `AuthController.handleRefresh` → `AuthService.refresh` → `PrismaRefreshTokenRepository` → Prisma `RefreshToken/User` → DB `refresh_tokens/users` → `auth.service.test.ts` | KỸ: `AuthService.refresh`; LƯỚT: cookie/token mapping |
| `US-F01-03` Logout | `auth.js:logout` → `POST /api/auth/logout` → `auth.routes.ts` (`public`, cookie refresh token được đọc trong controller) → `AuthController.handleLogout` → `AuthService.logout` → `SessionService` + `PrismaRefreshTokenRepository` → Prisma `RefreshToken` → DB `refresh_tokens` → `auth.service.test.ts` | KỸ: revoke rule; LƯỚT: response |
| `US-F01-04` Permission access | `WorkspaceLayout.vue`/`router/index.js` → request handler của action → API action đích → domain route (`requireAuth` + `requirePermission(code)`) → `auth.middleware.ts`/`rbac.middleware.ts` → controller/service đích → Prisma model/bảng của feature → `auth.middleware.test.ts`, `rbac.service.test.ts` | KỸ: middleware/effective permission; LƯỚT: menu computed |
| `US-F01-05` Registration hiện tại | `register.vue:handleRegister` → chỉ validate + message + chuyển login, chưa gọi API → `POST /api/auth/register` → `auth.routes.ts` (`public`) → `AuthController.handleRegister` → `AuthService.register` → `UserService.create` → Prisma `User/UserRole` → DB `users/user_roles` → `auth.service.test.ts` | KỸ: gap; BỎ QUA: layout |

## SPEC EXPECTS

F01-05 cần `registration_requests` và reviewer có `user_registration.review`; approve mới tạo user active, mặc định role `employee`.

## CURRENT CODE

Login, refresh, logout, auth middleware và permission middleware có code/test thực tế. Registration UI chưa gọi API; backend `/auth/register` là direct registration.

## GAPS

- Chưa có bảng/API/queue approve-reject registration request. Evidence: [auth.controller.ts](../../apps/backend/src/controllers/auth.controller.ts), [auth.routes.ts](../../apps/backend/src/routes/auth.routes.ts), [register.vue](../../apps/frontend/src/views/login/register.vue), [auth.service.test.ts](../../apps/backend/tests/auth.service.test.ts).
- Chưa gọi `registration-requests` như API catalog dự kiến.
