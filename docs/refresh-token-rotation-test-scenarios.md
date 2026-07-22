# Kịch bản Postman cơ bản: Register, Login, Refresh Reuse và Logout

Đây là một kịch bản ngắn để kiểm tra toàn bộ luồng auth hiện tại bằng Postman.

## 1. Chuẩn bị

Chạy backend từ thư mục root:

```bash
pnpm dev:backend
```

Base URL:

```text
http://localhost:3000
```

Đảm bảo database có:

- Department với `id = 1` hoặc thay bằng ID hợp lệ.
- Role mặc định `staff`.

Trong Postman, cookie được quản lý ở nút **Cookies** gần ô URL.

## 2. Register tài khoản

Gửi request:

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "departmentId": 1,
  "name": "Nguyen Van A",
  "password": "123456",
  "email": "vana@example.com",
  "phone": "0912345678"
}
```

Kết quả mong đợi:

```text
Status: 201 Created
```

Nếu email hoặc phone đã tồn tại, đổi sang giá trị khác rồi gửi lại.

## 3. Login và lưu refresh token R1

Gửi request:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "vana@example.com",
  "password": "123456"
}
```

Kết quả mong đợi:

```text
Status: 200 OK
Body: có data.accessToken và data.user
Cookie: có refreshToken
```

Lưu refresh token cũ:

1. Nhấn **Cookies** trong Postman.
2. Chọn domain `localhost`.
3. Chọn cookie `refreshToken`.
4. Sao chép value ra một nơi tạm thời và gọi nó là `R1`.

Chỉ sử dụng token local, không gửi token cho người khác.

Trạng thái database lúc này:

```text
R1: is_used = 0, is_revoked = 0, family_id = F1
```

## 4. Dùng R1 để refresh và nhận R2

Giữ nguyên cookie `R1` trong Postman và gửi:

```http
POST http://localhost:3000/api/auth/refresh
```

Không cần body và không cần access token.

Kết quả mong đợi:

```text
Status: 200 OK
Body: có data.accessToken mới
Cookie refreshToken được thay từ R1 thành R2
```

Trạng thái database:

```text
R1: is_used = 1, is_revoked = 0, family_id = F1
R2: is_used = 0, is_revoked = 0, family_id = F1
```

`R1` và `R2` có `jti` khác nhau nhưng cùng `family_id`.

## 5. Dùng lại R1 để kiểm tra reuse detection

Postman hiện đang giữ `R2`. Hãy cố tình thay nó bằng token cũ:

1. Nhấn **Cookies**.
2. Chọn cookie `refreshToken`.
3. Thay value hiện tại bằng giá trị `R1` đã lưu ở bước 3.
4. Lưu cookie.
5. Gửi lại:

```http
POST http://localhost:3000/api/auth/refresh
```

Kết quả mong đợi:

```text
Status: 401 Unauthorized
```

Response:

```json
{
  "error": "Invalid or expired refresh token"
}
```

Trạng thái database:

```text
R1: is_used = 1, is_revoked = 1, family_id = F1
R2: is_used = 0, is_revoked = 1, family_id = F1
```

Backend phát hiện `R1` đã được dùng nên revoke toàn bộ family `F1`. Cookie trên
Postman cũng bị xóa. `R2` không thể refresh tiếp dù nó là token mới hơn.

## 6. Login lại rồi logout

Do family `F1` đã bị revoke, gửi lại request login ở bước 3.

Kết quả mong đợi:

```text
Status: 200 OK
Cookie: nhận refreshToken mới thuộc family F2
F2 khác F1
```

Sau đó gửi:

```http
POST http://localhost:3000/api/auth/logout
```

Không cần body. Postman tự gửi refresh-token cookie hiện tại.

Kết quả mong đợi:

```text
Status: 204 No Content
Body: rỗng
Cookie refreshToken bị xóa
Các token thuộc family F2 có is_revoked = 1
```

## 7. Câu SQL kiểm tra

Thay `<USER_ID>` bằng `data.user.id` nhận được khi login:

```sql
SELECT
  id,
  jti,
  family_id,
  is_used,
  is_revoked,
  expires_at,
  created_at
FROM refresh_tokens
WHERE user_id = <USER_ID>
ORDER BY id ASC;
```

## 8. Kết quả cuối cùng cần thấy

```text
Register     -> 201
Login        -> 200, tạo R1/F1
Refresh R1   -> 200, R1 used, tạo R2 cùng F1
Reuse R1     -> 401, revoke toàn bộ F1
Login lại    -> 200, tạo family F2
Logout       -> 204, revoke F2 và xóa cookie
```
