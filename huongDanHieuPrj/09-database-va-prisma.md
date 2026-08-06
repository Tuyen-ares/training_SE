# 09. Đọc Database và Prisma

## File bắt đầu đọc

- [Prisma schema](../apps/backend/prisma/schema.prisma)
- [API catalog](../docs/contracts/api-catalog.md)

Project hiện chưa có một file `docs/database.md` ổn định. Khi cần xem database, dùng trực tiếp [Prisma schema](../apps/backend/prisma/schema.prisma) và đối chiếu với [API catalog](../docs/contracts/api-catalog.md).

## Cách đọc một model

Ví dụ model `assets`:

```text
assets.id              = khóa chính
assets.asset_model_id  = liên kết model
assets.department_id   = phòng ban quản lý
assets.status          = trạng thái hiện tại
assets.qr_code         = mã nhận diện
```

Khi thấy:

```prisma
asset_model_id Int
asset_models asset_models @relation(...)
```

nghĩa là mỗi asset thuộc một asset model.

## Các bảng quan trọng

```text
users
departments
roles
user_roles
permissions
role_permissions
assets
asset_models
brands
asset_types
borrow_requests
borrow_request_details
borrow_histories
asset_issues
notifications
```

## Quan hệ mượn trả

```text
users
  → borrow_requests
      → borrow_request_details
          → assets
          → borrow_histories
```

Người mượn được truy từ `borrow_requests.user_id`. Không lưu lặp người mượn trong `borrow_histories`.

## Quy tắc khi đọc database

- `PK` xác định một dòng.
- `FK` nối dòng này với bảng khác.
- `NULL` nghĩa là có thể chưa có giá trị.
- `UNIQUE` ngăn dữ liệu trùng.
- `INDEX` giúp tìm nhanh, không phải business rule.
- `ENUM` hoặc status string đại diện cho trạng thái.

Không tự sửa `schema.prisma` chỉ vì thấy code cần thêm field. Trước tiên phải đối chiếu requirement, xác định đó là nhu cầu thật hay chỉ là cách cài đặt hiện tại.
