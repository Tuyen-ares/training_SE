# Plan — Auth

> Input: [`spec.md`](spec.md). Plan này mô tả cách đáp ứng Auth contract; trạng thái
> thực tế được ghi tại [`implementation.md`](implementation.md).

## 1. Phạm vi

- Public register tạo tài khoản `staff`, không nhận role từ client.
- Login bằng email/password và cấp access token + refresh token.
- Refresh Token Rotation với reuse detection theo `jti`/`family_id`.
- Logout revoke family hiện tại.
- Chặn login/refresh đối với user `is_active=false`.
- Cung cấp `SessionService` cho Users thu hồi toàn bộ phiên của một user.

## 2. Kiến trúc và ownership

```text
auth.routes
  → AuthController
  → AuthService
      → IAuthRepository
      → IRefreshTokenRepository
      → TokenService
      → UserService (public register)
      → SessionService (revoke session)
```

- Controller sở hữu cookie và HTTP response.
- AuthService điều phối xác thực và rotation, không gọi Prisma trực tiếp.
- TokenService ký/verify JWT, đọc secret và thời hạn từ environment.
- RefreshTokenRepository là nơi duy nhất ghi `refresh_tokens`.
- UserService/RbacService sở hữu việc tạo user và ghi `user_roles`.

## 3. API contract

| Method | Endpoint | Auth | Kết quả |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Tạo tài khoản staff, không trả password/token |
| POST | `/api/auth/login` | Public | Trả access token + user; set refresh cookie |
| POST | `/api/auth/refresh` | Refresh cookie | Xoay token và set cookie mới |
| POST | `/api/auth/logout` | Refresh cookie nếu có | Revoke family, xóa cookie; idempotent |

Refresh token chỉ đi qua HttpOnly cookie. Access token được FE giữ trong memory và gửi
qua `Authorization: Bearer <token>`.

## 4. Data và migration

- `users.is_active` phải tồn tại và default `true`.
- `refresh_tokens.jti` unique.
- Index `family_id` phục vụ revoke/reuse detection.
- Không lưu JWT refresh token thô trong database.
- Environment bắt buộc: access secret, refresh secret và thời hạn tương ứng.

## 5. Luồng nghiệp vụ

### Login

1. Tìm user và dữ liệu permission bằng email.
2. Trả cùng lỗi `INVALID_CREDENTIALS` nếu user không tồn tại, password sai hoặc inactive.
3. Tạo family mới, ký access/refresh token.
4. Lưu refresh identity trước khi trả kết quả.

### Refresh rotation

1. Verify chữ ký refresh token.
2. Kiểm tra user còn active.
3. Trong transaction, đánh token cũ `is_used=true` và tạo token kế tiếp cùng family.
4. Nếu token cũ đã dùng, revoke toàn family và từ chối.
5. Chỉ trả/set token mới khi transaction thành công.

### Logout

1. Không có cookie hoặc cookie không hợp lệ vẫn trả kết quả logout an toàn.
2. Token hợp lệ thì revoke toàn family.
3. Controller luôn xóa refresh cookie.

## 6. Security, validation và errors

- Login không tiết lộ email hay password sai.
- Chỉ chấp nhận thuật toán JWT đã chốt.
- Cookie: HttpOnly; Secure ở production; SameSite và Path theo deployment contract.
- Không trả password hash, refresh-token record hoặc signing secret.
- `requireAuth` chỉ xác thực access token; permission do `rbac.middleware` xử lý.

## 7. Test strategy

- Unit: password, inactive user, login lỗi chung, rotation, reuse, logout.
- Concurrency unit: hai refresh cùng identity chỉ một luồng xoay thành công.
- Integration DB: chạy hai refresh đồng thời trên MariaDB thật và kiểm tra family state.
- HTTP/manual: cookie được set/rotate/clear đúng, CORS credentials hoạt động.

## 8. Thứ tự triển khai

1. Data model + repository contract.
2. TokenService và SessionService.
3. AuthService.
4. Controller/cookie và routes.
5. Middleware access token.
6. FE store với single-flight refresh.
7. Unit test rồi database integration test.

## 9. Không làm

- Không CRUD user trong Auth.
- Không CRUD role/permission hoặc tự ghi `user_roles`.
- Không lưu access token trong database.
- Không query permission database trong mỗi request đã có access token.
- Không thêm OAuth/SSO, password reset hoặc email verification trong giai đoạn này.
