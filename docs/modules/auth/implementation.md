# Implementation — Auth

> Bản ghi AS-BUILT tại thời điểm hiện tại. Requirement chuẩn là
> [`spec.md`](spec.md).

## 1. Trạng thái

**Backend core: đã triển khai.** Còn thiếu database integration test concurrency
trên MariaDB/MySQL thật.

## 2. Thành phần đã triển khai

- Route/controller: `auth.routes.ts`, `auth.controller.ts`.
- Business: `auth.service.ts`, `token.service.ts`, `session.service.ts`.
- Persistence: `auth.repository.ts`, `auth.prisma.repository.ts`,
  `refresh-token.repository.ts`, `refresh-token.prisma.repository.ts`.
- Security: `auth.middleware.ts`, `password-hasher.ts`.
- DTO/type: `auth.model.ts`, `express.d.ts`.
- Frontend session: `stores/auth.js`, Login/Register views và router guard.

## 3. API đang hoạt động

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Login/refresh trả access token; refresh token được quản lý bằng HttpOnly cookie.

## 4. Data/migration thực tế

- Có migration `refresh_tokens`.
- Có migration `users.is_active`.
- Rotation dùng `jti`, `family_id`, `is_used`, `is_revoked`, `expires_at`.

## 5. Kiểm thử có sẵn

- `tests/password-hasher.test.ts`
- `tests/auth.service.test.ts`
- Unit test bao gồm inactive user, reuse và hai refresh đồng thời ở cấp service.

Lệnh kiểm tra chuẩn:

```text
pnpm --filter backend typecheck
pnpm --filter backend test
```

## 6. Quyết định AS-BUILT

- Access token chứa `sub` và `permissionCodes`.
- Access token sống 15 phút qua `JWT_EXPIRES_IN=15m`; thiếu biến này thì
  TokenService từ chối cấp access token thay vì dùng giá trị hardcode.
- Refresh token sống 7 ngày.
- Public register dùng UserService/RbacService, không ghi `user_roles` trong Auth.
- Đổi role có hiệu lực khi cấp/refresh access token mới.

## 7. Phần còn thiếu

- Database integration test rotation/reuse concurrency trên MariaDB thật.
- Chưa có OAuth/SSO, password reset và email verification; đây là ngoài scope.
