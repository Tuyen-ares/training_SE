# Auth Module — Implementation Status

> Đây là ảnh chụp trạng thái triển khai, không phải nguồn yêu cầu chuẩn. Contract hiện hành nằm tại [Auth module](../modules/auth.md); nếu có khác biệt, tài liệu kiến trúc và module được ưu tiên.

## 1. Thông tin tài liệu

- Module: `auth`
- Backend: Express 5, TypeScript, Prisma, MySQL/MariaDB
- Trạng thái: đã triển khai luồng cơ bản
- API prefix: `/api/auth`
- Cập nhật: 2026-07-23

## 2. Mục tiêu

Auth module chịu trách nhiệm:

- Đăng ký tài khoản tự phục vụ với role mặc định `staff`.
- Xác thực email và password khi đăng nhập.
- Cấp access token chứa quyền Flat RBAC.
- Cấp và lưu refresh token theo từng phiên đăng nhập.
- Thực hiện Refresh Token Rotation.
- Phát hiện refresh token bị sử dụng lại và thu hồi toàn bộ token family.
- Đăng xuất bằng cách thu hồi phiên và xóa refresh-token cookie.

Auth module không chịu trách nhiệm quản trị CRUD user. Chức năng quản trị user thuộc User module.

## 3. Kiến trúc

Luồng phụ thuộc:

```text
auth.routes
    ↓
auth.controller
    ↓
auth.service
    ├── auth.repository
    ├── refresh-token.repository
    └── token.service
            ↓
       jsonwebtoken
```

Trách nhiệm:

| Thành phần | Trách nhiệm |
|---|---|
| Route | Khai báo endpoint và manual dependency injection |
| Controller | Validate request, xử lý cookie, chuyển lỗi thành HTTP response |
| AuthService | Điều phối register, login, refresh và logout |
| TokenService | Tạo/verify JWT; không truy vấn database |
| AuthRepository | Truy vấn user, role và permission |
| RefreshTokenRepository | Lưu, rotate và revoke refresh token bằng Prisma |

Controller và service không được gọi Prisma trực tiếp.

## 4. DTO và type

### 4.1 RegisterInputDto

```ts
interface RegisterInputDto {
  departmentId: number;
  name: string;
  password: string;
  email: string;
  phone: string;
}
```

Quy tắc:

- `departmentId`: số nguyên dương và phải tồn tại.
- `name`: từ 1 đến 30 ký tự.
- `password`: từ 6 đến 72 ký tự trước khi hash.
- `email`: email hợp lệ, tối đa 40 ký tự và không trùng.
- `phone`: từ 1 đến 10 ký tự và không trùng.

### 4.2 LoginInputDto

```ts
interface LoginInputDto {
  email: string;
  password: string;
}
```

### 4.3 AuthenticatedUserDto

Đây là dữ liệu user an toàn có thể trả cho client:

```ts
interface AuthenticatedUserDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  departmentId: number;
  roles: Array<{ id: number; name: string }>;
  permissionCodes: string[];
}
```

Không được chứa `password` hoặc `passwordHash`.

### 4.4 Token payload

Access token:

```ts
interface AccessTokenPayload {
  sub: number;
  permissionCodes: string[];
}
```

Refresh token:

```ts
interface RefreshTokenPayload {
  sub: number;
  jti: string;
  familyId: string;
}
```

Không cần claim `tokenType` vì access token và refresh token sử dụng hai secret riêng.

## 5. Token policy

### 5.1 Access token

- Secret: `JWT_SECRET`.
- Thuật toán: `HS256`.
- Thời hạn mặc định: `15m` nếu không cấu hình `JWT_EXPIRES_IN`.
- Được gửi qua header:

```http
Authorization: Bearer <accessToken>
```

- Không được lưu trong bảng `refresh_tokens`.
- Frontend nên giữ trong runtime state, ví dụ Pinia.

### 5.2 Refresh token

- Secret: `REFRESH_TOKEN_SECRET`.
- Thuật toán: `HS256`.
- Thời hạn mặc định: `7d` nếu không cấu hình `REFRESH_TOKEN_EXPIRES_IN`.
- Mỗi token có `jti` UUID duy nhất.
- Mỗi phiên đăng nhập có một `familyId` UUID.
- Chỉ được gửi trong cookie `HttpOnly`.
- Metadata được lưu trong bảng `refresh_tokens`.

Cookie policy:

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  expires: refreshTokenExpiresAt,
}
```

## 6. API contract

Tất cả JSON thành công, trừ response `204`, sử dụng envelope:

```json
{
  "data": {}
}
```

### 6.1 POST `/api/auth/register`

Request:

```json
{
  "departmentId": 1,
  "name": "Nguyen Van A",
  "password": "123456",
  "email": "vana@example.com",
  "phone": "0912345678"
}
```

Thành công: `201 Created`

```json
{
  "data": {
    "message": "Register successfully"
  }
}
```

Quy tắc nghiệp vụ:

- Email và phone phải duy nhất.
- Department phải tồn tại.
- Password phải được hash bằng bcrypt trước khi lưu.
- User mới được gán role có tên từ `DEFAULT_REGISTER_ROLE_NAME`, mặc định là `staff`.
- Register không tự động đăng nhập.

Lỗi:

| Trường hợp | Status |
|---|---:|
| Request không hợp lệ | 400 |
| Department không tồn tại | 400 |
| Email hoặc phone đã tồn tại | 409 |
| Lỗi cấu hình/database | 500 |

### 6.2 POST `/api/auth/login`

Request:

```json
{
  "email": "vana@example.com",
  "password": "123456"
}
```

Thành công: `200 OK`

```json
{
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": 1,
      "name": "Nguyen Van A",
      "email": "vana@example.com",
      "phone": "0912345678",
      "departmentId": 1,
      "roles": [],
      "permissionCodes": []
    }
  }
}
```

Refresh token được trả bằng header `Set-Cookie`, không xuất hiện trong JSON.

Quy tắc nghiệp vụ:

- Email hoặc password sai đều trả cùng thông báo để tránh lộ tài khoản tồn tại.
- Permission của mọi role được làm phẳng và loại bỏ phần tử trùng.
- Login tạo `familyId` mới và lưu refresh-token metadata vào database.

Lỗi:

| Trường hợp | Status |
|---|---:|
| Request không hợp lệ | 400 |
| Email/password sai | 401 |
| Lỗi cấu hình/database | 500 |

### 6.3 POST `/api/auth/refresh`

Request không có body. Refresh token được đọc từ cookie `refreshToken`.

Thành công: `200 OK`

```json
{
  "data": {
    "accessToken": "<new-access-token>"
  }
}
```

Response đồng thời ghi refresh token mới vào cookie.

Lỗi:

| Trường hợp | Status |
|---|---:|
| Thiếu cookie | 401 |
| Token sai chữ ký/hết hạn/sai payload | 401 |
| JTI không tồn tại hoặc phiên đã revoke | 401 |
| Phát hiện reuse | 401 và revoke toàn bộ family |
| Lỗi database | 500 |

### 6.4 POST `/api/auth/logout`

- Không yêu cầu access token vì access token có thể đã hết hạn.
- Đọc refresh token từ cookie nếu có.
- Revoke toàn bộ `familyId` của phiên.
- Xóa cookie.

Thành công: `204 No Content`.

Logout không có cookie vẫn được xem là hoàn tất thành công.

## 7. Refresh Token Rotation

Flow:

```text
Client gửi refresh token hiện tại
    ↓
TokenService verify chữ ký, thuật toán và payload
    ↓
Repository tìm jti trong database
    ↓
AuthService tải lại permission hiện tại của user
    ↓
Repository transaction
    ├── kiểm tra token chưa used/revoked/expired
    ├── đánh dấu token cũ is_used = true
    └── tạo token mới cùng familyId
    ↓
Trả access token mới và set refresh-token cookie mới
```

Ngày hết hạn là absolute session lifetime:

```text
Login ngày 01/08, hết hạn ngày 08/08
Rotate ngày 05/08
Token mới vẫn hết hạn ngày 08/08
```

Không được tự cộng thêm 7 ngày sau mỗi lần rotate.

### Reuse detection

Nếu token đã có `is_used = true` nhưng lại được gửi tới `/refresh`:

1. Revoke mọi token có cùng `family_id`.
2. Commit transaction.
3. Repository trả trạng thái `REUSED`.
4. Service phát sinh `REFRESH_TOKEN_REUSED` sau khi transaction đã commit.
5. Controller xóa cookie và trả `401`.

Frontend phải bảo đảm chỉ có một refresh request đang chạy tại một thời điểm.

## 8. Flat RBAC

- Access token chứa `permissionCodes`, không chứa toàn bộ role object.
- Middleware `requireAuth` xác thực access token.
- Middleware `requirePermission(code)` kiểm tra một permission code.
- Khi refresh, permission được query lại từ database trước khi tạo access token mới.
- Thay đổi permission không vô hiệu hóa access token đã cấp; thay đổi có hiệu lực khi token hết hạn hoặc được refresh.

## 9. Environment

```env
JWT_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRES_IN=7d
DEFAULT_REGISTER_ROLE_NAME=staff
FRONTEND_ORIGIN=http://localhost:5173
```

Frontend gọi login, refresh và logout với:

```ts
fetch(url, {
  method: 'POST',
  credentials: 'include',
});
```

## 10. Acceptance criteria

- [x] Register kiểm tra email, phone, department và gán role mặc định.
- [x] Password register được hash trước khi lưu.
- [x] Login trả access token và user an toàn.
- [x] Refresh token nằm trong HttpOnly cookie.
- [x] Refresh token metadata được lưu bằng `jti`.
- [x] Rotation đánh dấu token cũ và tạo token mới trong transaction.
- [x] Reuse detection revoke toàn bộ family.
- [x] Refresh tải lại permission hiện tại.
- [x] Logout revoke family và xóa cookie.
- [ ] Chưa kiểm tra `users.is_active` khi login/refresh.
- [ ] Chưa có service revoke toàn bộ phiên khi Users khóa tài khoản.
- [ ] Register chưa gọi `RbacService`; Auth repository vẫn đang ghi trực tiếp
  `user_roles`.
- [ ] Frontend chưa hoàn thiện API client và single-flight refresh.
- [ ] Chưa có automated test suite cho rotation/reuse.
- [ ] Chưa có job dọn refresh token đã hết hạn khỏi database.

## 11. Ngoài phạm vi hiện tại

- Quên/reset password.
- Xác minh email hoặc phone.
- Multi-factor authentication.
- Logout tất cả thiết bị.
- Quản lý danh sách phiên đăng nhập.
- Grace period cho refresh request đồng thời.
