# Cấu trúc mẫu cho một CRUD module

Tài liệu này mô tả pattern CRUD đang dùng trong backend Express + TypeScript +
Prisma. Department là implementation tham chiếu. Khi tạo resource mới, phải đọc
module spec và business rule của resource đó trước; không sao chép máy móc quy tắc
xóa hoặc query của Department.

## 1. Luồng phụ thuộc

```text
HTTP request
  → routes
  → controller
  → service
  → repository interface
  → Prisma repository
  → database
```

Chiều phụ thuộc không được đảo ngược. Controller và service không gọi Prisma trực
tiếp; repository không tạo HTTP response.

## 2. Cấu trúc file tham chiếu: Department

```text
apps/backend/src/
├── models/
│   └── department.model.ts
├── repositories/
│   ├── department.repository.ts
│   └── department.prisma.repository.ts
├── services/
│   └── department.service.ts
├── controllers/
│   └── department.controller.ts
└── routes/
    ├── department.routes.ts
    └── index.ts
```

## 3. Trách nhiệm từng file

| File/layer | Chịu trách nhiệm | Không được làm |
|---|---|---|
| Model | Khai báo entity, create DTO, update DTO | Query DB, xử lý HTTP |
| Repository interface | Hợp đồng CRUD và query đặc thù | Chứa Prisma implementation |
| Prisma repository | Query Prisma, đếm/kiểm tra quan hệ DB | Quyết định response/status HTTP |
| Service | Business rule, kiểm tra trùng, điều kiện xóa | Dùng `req`, `res` hoặc Prisma trực tiếp |
| Controller | Validate input, gọi service, trả `ApiResponse` | Chứa business rule hoặc query DB |
| Route | URL, HTTP method, authentication, permission | Chứa query và business logic |
| Route index | Đăng ký resource vào Express app | Khởi tạo business logic |

## 4. Contract của Department CRUD

| Method | Endpoint | Permission | Kết quả |
|---|---|---|---|
| GET | `/api/departments` | `department.view` | Danh sách department |
| GET | `/api/departments/:id` | `department.view` | Chi tiết hoặc `404` |
| POST | `/api/departments` | `department.create` | Tạo mới hoặc `409` nếu trùng tên |
| PATCH | `/api/departments/:id` | `department.update` | Đổi tên, `404` nếu không có, `409` nếu trùng |
| DELETE | `/api/departments/:id` | `department.delete` | `204`, hoặc `409` nếu còn user tham chiếu |

Department có các rule riêng:

- `name` bắt buộc, được trim, dài từ 1 đến 30 ký tự.
- Tên là unique.
- Không xóa department nếu `users.department_id` còn tham chiếu tới nó.

## 5. Cách triển khai một resource CRUD mới

1. Đọc `schema.prisma`, module spec và permission registry.
2. Chốt rõ resource được hard-delete, soft-delete hay chuyển trạng thái.
3. Tạo `models/<resource>.model.ts` với entity và DTO cần thiết.
4. Tạo repository interface kế thừa `IBaseRepository`.
5. Chỉ thêm query đặc thù thật sự cần cho business rule, ví dụ `findByName` hoặc
   `countReferences`.
6. Tạo Prisma repository kế thừa `BasePrismaRepository` và implement interface.
7. Tạo service kế thừa `BaseService`; đặt kiểm tra nghiệp vụ tại đây.
8. Tạo controller kế thừa `BaseController`; khai báo Zod schema và resource name.
9. Tạo route bằng `createRestRouter`, gắn `requireAuth` và permission tương ứng.
10. Thêm route definition vào `routes/index.ts`.
11. Chạy `pnpm.cmd --filter backend typecheck`.
12. Kiểm tra ít nhất các case: thành công, input sai, không tồn tại, trùng unique,
    vi phạm foreign key/business rule và thiếu permission.

## 6. Quy tắc dành cho AI khi sinh CRUD

Có thể đưa nguyên mục này cho AI cùng tên resource cần làm:

```text
Hãy triển khai CRUD <resource> theo pattern trong docs/crud-module-structure.md.

Trước khi code:
- Đọc AGENTS.md, Prisma schema, module spec và permission registry.
- Nêu rõ hard-delete/soft-delete/state transition và các quan hệ đang tham chiếu.

Khi code:
- Giữ luồng routes → controllers → services → repositories → Prisma.
- Controller chỉ validate và trả ApiResponse.
- Business rule đặt trong service.
- Chỉ Prisma repository được gọi Prisma.
- Repository interface kế thừa IBaseRepository khi đây là CRUD thông thường.
- Route phải có requireAuth và permission code tồn tại trong registry.
- Đăng ký route trong routes/index.ts.
- Không tự thêm field, permission hoặc business rule chưa có trong schema/spec.
- Không cho phép cập nhật trực tiếp state nếu spec yêu cầu action nghiệp vụ riêng.

Sau khi code:
- Chạy pnpm.cmd --filter backend typecheck.
- Báo các file đã tạo/sửa, API contract và những case chưa thể kiểm thử.
```

## 7. Khi không nên dùng nguyên Base CRUD

Không dùng CRUD chung cho bảng trung gian hoặc bảng lịch sử như `user_roles`,
`role_permissions`, `refresh_tokens`, `borrow_histories`. Các bảng đó phải được thay
đổi qua action nghiệp vụ như `assignRole`, `rotate`, `approveBorrowRequest` hoặc
`returnAsset`.

Tương tự, `DELETE` không mặc định là SQL delete: user dùng `is_active=false`, asset
chuyển sang `retired`, còn department mới được hard-delete khi không có user tham
chiếu.
