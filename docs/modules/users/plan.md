# Plan — Users & Departments

> Input: [`spec.md`](spec.md). Users sở hữu hồ sơ/tài khoản; RBAC sở hữu role;
> Auth sở hữu phiên.

## 1. Phạm vi

- Admin CRUD user với response không có password.
- Admin tạo/cập nhật user và chọn role; mặc định `staff` nếu không truyền role.
- Deactivate/activate bằng `is_active`, không hard delete.
- Revoke mọi refresh-token session khi deactivate.
- CRUD department và chặn xóa khi còn user tham chiếu.

## 2. Kiến trúc và ownership

```text
User routes → UserController → UserService
                              ├─ IUserRepository
                              ├─ RbacService.assignRoles(...)
                              ├─ SessionService.revokeAllForUser(...)
                              └─ Prisma transaction coordinator
```

- UserRepository chỉ ghi `users`.
- RbacService là boundary duy nhất ghi `user_roles`.
- SessionService là boundary thu hồi refresh token; Users không import Auth repository.
- Password hasher là helper dùng chung cho register/admin create/update.

## 3. API contract

| Method | Endpoint | Permission | Semantics |
|---|---|---|---|
| GET | `/api/users?status=active|inactive|all` | `user.view` | Danh sách an toàn |
| GET | `/api/users/:id` | `user.view` | Chi tiết an toàn |
| POST | `/api/users` | `user.create`; thêm `role.assign` nếu gửi role | Tạo user |
| PUT/PATCH | `/api/users/:id` | `user.update`; conditional `role.assign` | Partial update theo DTO |
| DELETE | `/api/users/:id` | `user.delete` | Deactivate, không xóa row |
| PATCH | `/api/users/:id/activate` | `user.update` | Kích hoạt lại |
| CRUD | `/api/departments` | `department.*` | Quản lý phòng ban |

## 4. Data và migration

- `users.is_active Boolean @default(true)`.
- Email/phone vẫn unique kể cả inactive.
- Không thêm `deleted_at`.
- Department name unique.
- Tạo user + gán role nằm trong cùng Prisma interactive transaction.

## 5. Luồng nghiệp vụ

### Create

1. Validate department, email/phone và role IDs.
2. Hash password.
3. Mở transaction.
4. UserRepository tạo user.
5. RbacService gán role được chọn hoặc `staff`.
6. Query/return safe user response.

### Update

- Chỉ đưa các field thực sự xuất hiện vào `UpdateUserData`.
- Hash lại password nếu password được gửi.
- Validate role và department trước ghi.
- Nếu có roleIds, thay toàn bộ tập role trong transaction.

### Deactivate

1. Đặt `is_active=false`.
2. Revoke toàn bộ refresh token của user.
3. Giữ row và lịch sử liên quan.

## 6. Authorization, validation và errors

- Mọi endpoint admin dùng `requireAuth` + permission.
- `role.assign` chỉ bắt buộc khi payload có `roleIds`.
- Không serialize `password`/`passwordHash`.
- Duplicate, department/role không tồn tại trả application error rõ ràng.
- Filter status chỉ nhận enum đã chốt.

## 7. Test strategy

- Unit: hashing, default/explicit roles, safe response, update partial, inactive.
- Integration HTTP/DB: permission, role.assign conditional, transaction rollback,
  deactivate thay delete, department FK.
- Manual FE: lọc active/inactive, create/edit, deactivate/activate.

## 8. Thứ tự triển khai

1. Migration `is_active`.
2. Safe repository selects và DTOs.
3. Shared password hasher.
4. UserService + cross-module transaction.
5. Controller/routes/permission.
6. Department dependency guard.
7. Unit/integration tests.
8. Frontend user/department management.

## 9. Không làm

- Không login/verify token trong Users.
- Không ghi trực tiếp `user_roles` hoặc `refresh_tokens`.
- Không hard delete user.
- Không trả entity persistence chứa password.
- Chưa làm self-service profile cho tới khi câu hỏi trong spec được chốt.
