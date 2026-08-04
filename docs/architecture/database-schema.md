# Database schema

Nguồn sự thật của database là
[`apps/backend/prisma/schema.prisma`](../../apps/backend/prisma/schema.prisma).
File này không sao chép lại toàn bộ model/column để tránh tài liệu lệch Prisma.

## Quy ước

- Thay đổi schema phải đi qua Prisma migration.
- Unique/FK/composite key được định nghĩa ở Prisma schema và migration.
- Ownership của từng bảng xem [`module-boundaries.md`](module-boundaries.md).
- Business transition không được suy ra chỉ từ enum; phải theo
  [`system-overview.md`](system-overview.md).

## Thay đổi đã chốt nhưng chưa migrate

- Thêm `users.is_active Boolean @default(true)`.

## Thay đổi đã triển khai

- Enum `assets_status` có `reserved` để giữ Asset cho một đơn mượn `pending`.
- Enum `assets_status` có `retired` để ngừng sử dụng Asset mà không xóa lịch sử.

Khi migration hoàn thành, cập nhật mục này để phản ánh trạng thái đã triển khai,
không tạo một bản schema Markdown thứ hai.
