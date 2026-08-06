# 04. Ví dụ trace Login

## Requirement

- [US-F01-01 – Login](../docs/mvp-requirements/07-user-stories/authentication-access/US-F01-01-login.md)
- [F01 Authentication & Access](../docs/mvp-requirements/06-features/F01-authentication-access.md)

## Chuỗi code chính

```text
Login.vue
→ auth store/service
→ POST /api/auth/login
→ auth.routes.ts
→ auth.controller.ts
→ auth.service.ts
→ auth.repository.ts
→ users
→ tạo access/refresh session
→ router chuyển dashboard
```

Các file bắt đầu đọc:

- [Login.vue](../apps/frontend/src/views/login/Login.vue)
- [Auth routes](../apps/backend/src/routes/auth.routes.ts)
- [Auth controller](../apps/backend/src/controllers/auth.controller.ts)
- [Auth service](../apps/backend/src/services/auth.service.ts)
- [Auth model](../apps/backend/src/models/auth.model.ts)
- [Prisma schema](../apps/backend/prisma/schema.prisma)

## Sáu câu cần trả lời

1. Login nhận email và password ở đâu?
2. Frontend gọi method và URL nào?
3. Backend kiểm tra tài khoản active ở đâu?
4. Password được hash/compare ở lớp nào?
5. Token/session được tạo và lưu thế nào?
6. Sau login, router quyết định chuyển đi đâu?

## Lỗi thường gặp

- Login UI đúng nhưng API URL sai.
- Password đã đổi trong database nhưng backend đang kết nối database khác.
- User `is_active = false` nên login bị từ chối.
- Token có nhưng frontend không lưu hoặc không gửi ở request sau.

