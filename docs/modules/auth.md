# 01 — Auth (Authentication)

> Xác thực người dùng: login, cấp JWT, refresh token rotation, logout.
> KHÁC với module 04 RBAC (phân quyền — "được làm gì"). Đây là "bạn là ai".

## 1. Goals

- Cho phép người dùng đăng nhập bằng email + password và nhận access token + refresh token.
- Làm mới access token bằng refresh token rotation an toàn (chống token reuse).
- Cho phép đăng xuất (revoke refresh token).

## 2. Non-goals

- Không quản lý CRUD user (thuộc module 03).
- Không kiểm tra quyền hạn (thuộc module 04 / rbac.middleware).
- Không hỗ trợ đăng nhập mạng xã hội / SSO ở bản này.
- Không cho người dùng tự chọn role khi đăng ký. Public register chỉ tạo tài khoản
  thường và gán role mặc định `staff`.

## 3. Data model (Prisma, đã có)

- `users`: id, email (unique), password (bcrypt, VarChar 60), `is_active` (sau
  migration của module 03), ...
- `refresh_tokens`: id, jti (unique), user_id, family_id, is_used, is_revoked,
  expires_at, created_at.

## 4. Constraints

- Access token: JWT, hạn ngắn (đề xuất 15 phút — chốt giá trị trong config).
- Refresh token: hạn dài hơn (đề xuất 7 ngày — chốt trong config), lưu qua `jti`.
- Không lộ việc email có tồn tại hay không khi login sai.
- Secret ký JWT chỉ đọc từ biến môi trường.
- Public register phải kiểm tra email/phone/department hợp lệ, hash password, tạo user
  và gán role mặc định `staff` thông qua service/module sở hữu tương ứng. Auth không
  được tự ghi trực tiếp bảng `user_roles`.
- Login/refresh chỉ cấp token cho user có `is_active=true`. Khi module Users ngừng
  tài khoản, Auth cung cấp service nội bộ để revoke toàn bộ refresh-token family của user đó.

## 5. Acceptance Criteria (EARS)

### Ubiquitous

- REQ-0101: The system shall ký access token bằng secret đọc từ biến môi trường.
- REQ-0102: The system shall lưu refresh token dưới dạng `jti`, không lưu token thô có thể tái sử dụng.

### Event-driven

- REQ-0110: When người dùng gửi email + password đúng, the system shall trả về một access token và một refresh token, đồng thời tạo bản ghi `refresh_tokens` mới với `family_id` mới, `is_used=false`, `is_revoked=false`.
- REQ-0111: When người dùng gửi một refresh token hợp lệ (tồn tại, `is_used=false`, `is_revoked=false`, chưa hết hạn), the system shall đánh dấu token đó `is_used=true`, cấp cặp token mới cùng `family_id`, và trả về access + refresh token mới.
- REQ-0112: When logout, the system shall revoke all refresh tokens in the current family_id.
- REQ-0113: When người dùng đăng ký public hợp lệ, the system shall tạo user mới với
  password đã hash và gán role mặc định `staff`; response không trả password/hash/token.

### Unwanted behavior

- REQ-0130: If email không tồn tại hoặc password sai, then the system shall trả lỗi xác thực chung (không tiết lộ vế nào sai).
- REQ-0131: If refresh token đã hết hạn hoặc `is_revoked=true`, then the system shall từ chối và yêu cầu đăng nhập lại.
- REQ-0132: If một refresh token có `is_used=true` bị dùng lại (reuse detection), then the system shall revoke TOÀN BỘ token cùng `family_id` và từ chối yêu cầu.
- REQ-0133: If access token thiếu, sai chữ ký, hoặc hết hạn, then `auth.middleware` shall trả lỗi 401.
- REQ-0134: If public register gửi role/permission/admin flag, then the system shall bỏ qua
  hoặc từ chối các trường đó; client không được tự nâng quyền.
- REQ-0135: If user có `is_active=false` thực hiện login hoặc refresh, then the
  system shall từ chối bằng lỗi xác thực chung và không cấp token mới.

## 6. Events emitted

(không có event nghiệp vụ cần thông báo ở bản này)

## 7. Trạng thái triển khai hiện tại

Đã triển khai:

- [x] Public register với role mặc định `staff`.
- [x] Login và cấp access token chứa `permissionCodes`.
- [x] Refresh Token Rotation với `jti` và `family_id`.
- [x] Phát hiện reuse và revoke token family.
- [x] Logout revoke family và xóa HttpOnly cookie.
- [x] `requireAuth` verify access token.

Chưa triển khai:

- [ ] Đọc `users.is_active` trong Auth repository.
- [ ] Từ chối login khi `is_active=false`.
- [ ] Từ chối refresh và revoke phiên khi `is_active=false`.
- [ ] Cung cấp service nội bộ để Users revoke toàn bộ phiên của một user.
- [ ] Chuyển việc gán role mặc định khi register sang `RbacService`; hiện Auth
  repository vẫn ghi trực tiếp `user_roles`.
- [ ] Automated test cho rotation, reuse và hai refresh request đồng thời.

## 8. Câu hỏi mở

- [x] Hạn access / refresh token cụ thể là bao nhiêu?
=>access = 15p, refresh = 7 days
- [x] Có giới hạn số phiên (số refresh token active) trên mỗi user không?
=>không, nhưng có thể revoke toàn bộ family khi phát hiện reuse.
- [x] Refresh token gửi qua body hay httpOnly cookie?
=>httpOnly cookie, secure, sameSite=lax, path=/api/auth/refresh
- [x] Logout revoke current token hay revoke cả family?
=>revoke tất cả token cùng family, xóa cookie. Nếu family đã bị revoke, login lại sẽ tạo family mới.
