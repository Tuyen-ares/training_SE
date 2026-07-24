# User Module — Implementation Status

> Đây là ảnh chụp trạng thái cũ. Contract hiện hành nằm tại
> [Users spec](../modules/users/spec.md) và trạng thái mới tại
> [Users implementation](../modules/users/implementation.md).

## 1. Thông tin tài liệu

- Module: `users`
- Backend: Express 5, TypeScript, Prisma, MySQL/MariaDB
- Trạng thái: User/Auth/RBAC security contract đã triển khai; còn UI edit role và
  database concurrency test nâng cao
- API prefix: `/api/users`
- Cập nhật: 2026-07-23

## 2. Mục tiêu

User module phục vụ quản trị tài khoản bởi người có permission phù hợp:

- Xem danh sách user.
- Xem chi tiết user.
- Tạo user quản trị.
- Cập nhật thông tin, department và role của user.
- Xóa user.

User module khác với Auth register:

| Auth register | User create |
|---|---|
| Tự đăng ký | Quản trị viên tạo tài khoản |
| Luôn nhận role mặc định `staff` | Quản trị viên chỉ định role |
| Không yêu cầu access token | Yêu cầu `user.create` |

## 3. Kiến trúc

```text
user.routes
    ↓
user.controller
    ↓
user.service
    ↓
user.repository
    ↓
Prisma
```

Trách nhiệm:

| Thành phần | Trách nhiệm |
|---|---|
| Route | Endpoint và middleware Flat RBAC |
| Controller | Validate request và tạo HTTP response |
| Service | Quy tắc unique, hash password, kiểm tra department/role |
| Repository | CRUD và query user; không chứa HTTP/business logic |

## 4. Domain và DTO mục tiêu

### 4.1 User model nội bộ

```ts
interface User {
  id: number;
  departmentId: number;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
}
```

Model nội bộ có thể chứa `passwordHash` để phục vụ nghiệp vụ, nhưng không được trả trực tiếp qua HTTP.

### 4.2 CreateUserInputDto

```ts
interface CreateUserInputDto {
  departmentId: number;
  name: string;
  email: string;
  phone: string;
  password: string;
  roleIds?: number[];
}
```

### 4.3 UpdateUserInputDto

```ts
interface UpdateUserInputDto {
  departmentId?: number;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  roleIds?: number[];
}
```

### 4.4 UserResponseDto

```ts
interface UserResponseDto {
  id: number;
  departmentId: number;
  department: { id: number; name: string };
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  roles: Array<{ id: number; name: string }>;
}
```

Không được có `password` hoặc `passwordHash` trong response DTO.

### 4.5 Repository data

Service phải chuyển password thô thành password hash trước khi gọi repository:

```ts
interface CreateUserData {
  departmentId: number;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
}
```

Repository không nhận password thô.

## 5. Authorization

Mọi endpoint User module đều yêu cầu access token hợp lệ.

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/users` | `user.view` |
| GET | `/api/users/:id` | `user.view` |
| POST | `/api/users` | `user.create` |
| PATCH | `/api/users/:id` | `user.update` |
| DELETE | `/api/users/:id` | `user.delete` |

Kết quả middleware:

- Thiếu/sai/hết hạn access token: `401 Unauthorized`.
- Có token nhưng thiếu permission: `403 Forbidden`.

## 6. API contract mục tiêu

### 6.1 GET `/api/users`

Thành công: `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "departmentId": 1,
      "name": "Nguyen Van A",
      "email": "vana@example.com",
      "phone": "0912345678",
      "roles": [
        { "id": 2, "name": "staff" }
      ]
    }
  ]
}
```

Không được trả password hoặc password hash.

### 6.2 GET `/api/users/:id`

Thành công: `200 OK` với một `UserResponseDto`.

Lỗi:

| Trường hợp | Status |
|---|---:|
| ID không hợp lệ | 400 |
| User không tồn tại | 404 |

### 6.3 POST `/api/users`

Request:

```json
{
  "departmentId": 1,
  "name": "Nguyen Van A",
  "email": "vana@example.com",
  "phone": "0912345678",
  "password": "123456",
  "roleIds": [2]
}
```

Thành công: `201 Created` với `UserResponseDto`.

Quy tắc:

- Email và phone phải duy nhất.
- Department phải tồn tại.
- Mọi `roleId` phải tồn tại.
- Nếu `roleIds` có phần tử, người gọi phải có `role.assign` và mọi role phải tồn tại.
- Nếu không gửi hoặc gửi mảng rỗng, backend gán role mặc định `staff`.
- Password phải được hash bằng bcrypt trước khi repository lưu.
- Tạo user và các bản ghi `user_roles` trong cùng transaction/nested write.

### 6.4 PATCH `/api/users/:id`

Request có thể chứa một hoặc nhiều field:

```json
{
  "name": "Nguyen Van B",
  "departmentId": 2,
  "roleIds": [2, 3]
}
```

Quy tắc:

- Chỉ kiểm tra unique email/phone nếu giá trị được thay đổi.
- Nếu có password mới, service phải hash lại.
- Nếu có `roleIds`, cập nhật quan hệ `user_roles` trong transaction.
- Response không chứa password hash.

### 6.5 DELETE `/api/users/:id`

Contract đã triển khai: đặt `is_active=false`, giữ nguyên row và lịch sử, sau đó
revoke toàn bộ refresh token của user. `PATCH /api/users/:id/activate` dùng để
kích hoạt lại.

## 7. Validation

| Field | Rule |
|---|---|
| `id` | Số nguyên dương |
| `departmentId` | Số nguyên dương và tồn tại |
| `name` | 1–30 ký tự |
| `email` | Email hợp lệ, tối đa 40 ký tự, unique |
| `phone` | Tối đa 10 ký tự, unique |
| `password` | 6–72 ký tự trước khi hash |
| `roleIds` | Mảng ID nguyên dương, không trùng, ít nhất một phần tử khi create |

Unknown fields trong request nên bị từ chối bằng strict Zod schema.

## 8. Repository contract

Repository nhận primitive hoặc repository data, không nhận Express request/response.

Repository trả internal model/record đầy đủ cho service. Service chịu trách nhiệm chuyển thành `UserResponseDto` trước khi controller trả dữ liệu.

Repository được phép chứa:

- Prisma query.
- Mapping snake_case database sang camelCase model.
- Transaction/nested write để bảo đảm tính nguyên tử.

Repository không được chứa:

- `bcrypt.hash()`.
- Kiểm tra permission HTTP.
- Tạo API response.
- Quyết định HTTP status.

## 9. Tương tác với Auth và RBAC

- User create dành cho quản trị; Auth register dành cho tự đăng ký.
- Role của user nằm trong bảng `user_roles`, không nằm trực tiếp trong `users`.
- Permission được suy ra qua `user_roles → roles → role_permissions → permissions`.
- Access token đang cache `permissionCodes`.
- Khi role thay đổi, access token hiện tại vẫn giữ quyền cũ đến khi hết hạn hoặc refresh.
- Refresh endpoint tải lại permission mới nhất trước khi cấp access token mới.
- Khóa user phải revoke toàn bộ refresh token; login/refresh cũng phải kiểm tra
  `is_active`.

## 10. Error contract

| Trường hợp | Status |
|---|---:|
| Request/ID không hợp lệ | 400 |
| Chưa xác thực | 401 |
| Thiếu permission | 403 |
| User/department/role không tồn tại | 404 hoặc 400 theo request context |
| Email/phone trùng | 409 |
| Database/configuration error | 500 |

Không trả raw Prisma error hoặc stack trace cho client.

## 11. Trạng thái code hiện tại

Đã có:

- [x] Route `requireAuth` và permission riêng cho view/create/update/delete.
- [x] DTO HTTP camelCase; repository chỉ nhận password hash.
- [x] Password helper dùng chung cho register và admin create/update.
- [x] Prisma safe-select và `UserResponseDto` không chứa password/hash.
- [x] Role tùy chọn; bỏ trống gán `staff`; role chỉ định yêu cầu `role.assign`.
- [x] `RbacService` sở hữu việc ghi `user_roles` trong transaction.
- [x] Migration `users.is_active`; deactivate/activate; revoke toàn bộ session.
- [x] Auth từ chối inactive login/refresh bằng lỗi chung.
- [x] Unit test và MySQL API integration test cho các contract chính.

Chưa làm:

- [ ] Màn hình chỉnh sửa tập role cho user đã tồn tại.
- [ ] MySQL integration test cho hai refresh request thực sự chạy đồng thời.

## 12. Acceptance criteria

User module chỉ được xem là hoàn thiện khi:

- [ ] Mọi response user không chứa password/passwordHash.
- [ ] Password luôn được hash trước khi lưu.
- [ ] Create user gán ít nhất một role.
- [ ] Update role được thực hiện nguyên tử.
- [ ] Khóa user đặt `is_active=false` và revoke toàn bộ refresh token.
- [ ] User không hoạt động không thể login hoặc refresh.
- [ ] Email và phone unique được xử lý thành `409`.
- [ ] Department/role không tồn tại được xử lý rõ ràng.
- [ ] DTO dùng camelCase nhất quán ở HTTP boundary.
- [ ] Repository chỉ làm persistence và mapping.
- [ ] Permission middleware bảo vệ đúng từng endpoint.
- [ ] Có test cho CRUD, validation, password safety và RBAC.

## 13. Ngoài phạm vi hiện tại

- User profile tự chỉnh sửa.
- Đổi password yêu cầu password cũ.
- Reset/quên password.
- Phân trang, tìm kiếm và lọc user.
- Audit log thay đổi role.
