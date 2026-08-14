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

## Thay đổi đã triển khai

- `users.is_active` và `departments.is_active` là boolean với default `true`;
  status được đổi qua lifecycle endpoint, không phải hard-delete.
- Enum `assets_status` có `reserved` để giữ Asset cho một đơn mượn `pending`.
- Enum `assets_status` có `retired` để ngừng sử dụng Asset mà không xóa lịch sử.
- `assets.asset_code` là mã duy nhất, bất biến; `asset_types.normalized_prefix` và
  `asset_code_sequences` cấp sequence an toàn theo prefix trong transaction.
- Shared `vendors` lưu master vendor với `is_active`; `asset_issues.vendor_id`
  tham chiếu `vendors.id` bằng `ON DELETE RESTRICT`. Legacy
  `asset_issues.repair_provider` đã được trim/deduplicate/backfill theo expand
  migration và đã bị loại bỏ bởi contract migration sau khi code mới sẵn sàng.
- Permission migration thêm `user.manage_status`, `vendor.manage_status` và
  `department.manage_status`, backfill các role grant cũ theo permission row,
  rồi loại bỏ `user.delete`, `vendor.delete`, `department.delete` và
  `role.delete` khỏi runtime catalogue.

Mọi thay đổi schema tiếp theo phải cập nhật mục đã triển khai này, không tạo một
bản schema Markdown thứ hai.
