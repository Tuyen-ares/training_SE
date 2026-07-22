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
- Không đăng ký tài khoản tự phục vụ (user do admin tạo — module 03).

## 3. Data model (Prisma, đã có)
- `users`: id, email (unique), password (bcrypt, VarChar 60), ...
- `refresh_tokens`: id, jti (unique), user_id, family_id, is_used, is_revoked,
  expires_at, created_at.

## 4. Constraints
- Access token: JWT, hạn ngắn (đề xuất 15 phút — chốt giá trị trong config).
- Refresh token: hạn dài hơn (đề xuất 7 ngày — chốt trong config), lưu qua `jti`.
- Không lộ việc email có tồn tại hay không khi login sai.
- Secret ký JWT chỉ đọc từ biến môi trường.

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0101: The system shall ký access token bằng secret đọc từ biến môi trường.
- REQ-0102: The system shall lưu refresh token dưới dạng `jti`, không lưu token thô có thể tái sử dụng.

### Event-driven
- REQ-0110: When người dùng gửi email + password đúng, the system shall trả về một access token và một refresh token, đồng thời tạo bản ghi `refresh_tokens` mới với `family_id` mới, `is_used=false`, `is_revoked=false`.
- REQ-0111: When người dùng gửi một refresh token hợp lệ (tồn tại, `is_used=false`, `is_revoked=false`, chưa hết hạn), the system shall đánh dấu token đó `is_used=true`, cấp cặp token mới cùng `family_id`, và trả về access + refresh token mới.
- REQ-0112: When người dùng đăng xuất, the system shall đánh dấu `is_revoked=true` cho refresh token hiện tại.

### Unwanted behavior
- REQ-0130: If email không tồn tại hoặc password sai, then the system shall trả lỗi xác thực chung (không tiết lộ vế nào sai).
- REQ-0131: If refresh token đã hết hạn hoặc `is_revoked=true`, then the system shall từ chối và yêu cầu đăng nhập lại.
- REQ-0132: If một refresh token có `is_used=true` bị dùng lại (reuse detection), then the system shall revoke TOÀN BỘ token cùng `family_id` và từ chối yêu cầu.
- REQ-0133: If access token thiếu, sai chữ ký, hoặc hết hạn, then `auth.middleware` shall trả lỗi 401.

## 6. Events emitted
(không có event nghiệp vụ cần thông báo ở bản này)

## 7. Câu hỏi mở
- [ ] Hạn access / refresh token cụ thể là bao nhiêu?
- [ ] Có giới hạn số phiên (số refresh token active) trên mỗi user không?
- [ ] Refresh token gửi qua body hay httpOnly cookie?
