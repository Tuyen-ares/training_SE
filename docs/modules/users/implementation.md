# Implementation — Users & Departments

## 1. Trạng thái

**Backend core: đã triển khai.** User CRUD semantics, role assignment,
`is_active`, session revoke và Department CRUD đã có.

## 2. Thành phần đã triển khai

- User model/repository/Prisma repository/service/controller/routes.
- Department model/repository/Prisma repository/service/controller/routes.
- `RbacService` dùng khi tạo/cập nhật role.
- `SessionService` dùng khi deactivate.
- `shared/security/password-hasher.ts`.
- User API integration test và service unit tests.

## 3. API đang hoạt động

- CRUD `/api/users`
- `PATCH /api/users/:id/activate`
- CRUD `/api/departments`

`DELETE /api/users/:id` có semantics deactivate.

## 4. Data/migration thực tế

- `users.is_active` đã có migration và default `true`.
- User response dùng Prisma select/DTO an toàn.
- Email/phone giữ unique với tài khoản inactive.

## 5. Kiểm thử có sẵn

- `tests/user.service.test.ts`
- `tests/user-api.integration.test.ts`
- `tests/password-hasher.test.ts`

Lệnh:

```text
pnpm --filter backend test
pnpm --filter backend test:db
pnpm --filter backend typecheck
```

Integration test cần database test được cấu hình trước khi chạy.

## 6. Quyết định AS-BUILT

- Một user có thể có nhiều role nên DTO dùng `roles[]`/`roleIds[]`.
- Tạo không truyền role sẽ gán `staff`.
- Update đang hỗ trợ payload partial dù route generic có thể mang tên update;
  không gửi field nào thì field đó không bị ghi đè.
- Access token cũ của user bị deactivate có thể sống tối đa 15 phút.

## 7. Phần còn thiếu

- Chưa chốt self-service profile.
- Frontend Users đã có route/view nhưng vẫn cần review đầy đủ với API mới.
- Frontend Departments chưa có luồng hoàn chỉnh.
