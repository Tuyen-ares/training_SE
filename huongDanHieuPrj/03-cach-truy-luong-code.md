# 03. Cách trace code từ FE xuống BE

## Chuỗi đọc chuẩn

```text
View (.vue)
→ hàm xử lý click/submit
→ service (.js)
→ URL + method HTTP
→ route (.routes.ts)
→ middleware/permission
→ controller (.controller.ts)
→ service nghiệp vụ (.service.ts)
→ repository (.repository.ts)
→ Prisma schema
→ database
```

## Vai trò từng file

| Thành phần | Nhiệm vụ |
|---|---|
| View | Hiển thị dữ liệu và nhận thao tác người dùng |
| Frontend service | Gọi API, không chứa business rule lớn |
| Route | Khai báo URL, method và middleware |
| Middleware | Xác thực token và kiểm tra permission |
| Controller | Đọc request, validate input, trả response |
| Service | Xử lý business rule và điều phối nhiều bước |
| Repository | Đọc/ghi database qua Prisma |
| Prisma schema | Mô tả model, field, relation và constraint |
| Integration test | Kiểm chứng cả chuỗi backend với database |

## Business rule nằm ở đâu?

Không phải rule nào cũng nằm cùng một file:

- Permission: route/middleware.
- Kiểm tra dữ liệu đầu vào: controller/schema.
- Chuyển trạng thái và transaction: service.
- Constraint như unique/foreign key: database/Prisma.
- Câu lệnh đọc ghi: repository.

## Cách tìm nhanh bằng tìm kiếm

Tìm tên screen:

```text
rg "BorrowRequestCreate|ApprovalDetail" apps/frontend/src
```

Tìm endpoint:

```text
rg "borrow-requests|approve-all" apps/frontend/src apps/backend/src
```

Tìm model database:

```text
rg "model borrow_requests|model assets" apps/backend/prisma/schema.prisma
```

Đừng mở quá nhiều kết quả cùng lúc. Mỗi lần chỉ chọn file thuộc đúng action đang học.

