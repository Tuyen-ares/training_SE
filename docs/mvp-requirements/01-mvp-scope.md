# Phạm vi MVP

## Trong phạm vi

- Đăng nhập, refresh, logout và authorization theo flat RBAC.
- Quản lý asset, brand, type, model và department quản lý asset ở mức MVP.
- Tạo phiếu mượn một hoặc nhiều asset; xem và thu hồi phiếu hợp lệ.
- Duyệt/từ chối từng detail; Approve All theo partial success; giữ chỗ asset.
- Xác nhận bàn giao, hoàn trả và xem lịch sử mượn.
- Báo, xác minh và theo dõi sửa chữa asset.
- Thông báo trong hệ thống.
- Quản lý user và gán/gỡ role có sẵn.

## Ngoài phạm vi

- Kiểm kê/stocktake, quản lý kho hoặc QR stocktake.
- Bảng location, lịch sử location/department hoặc asset history riêng.
- Booking calendar, tự hết hạn reservation và SLA phê duyệt.
- Procurement, purchase, depreciation/accounting và lịch bảo trì định kỳ.
- Email, SMS, mobile push hoặc dashboard analytics nâng cao.
- Role inheritance, wildcard permission, CRUD role và CRUD permission code.
- Tự chọn role khi đăng ký; role được reviewer gán sau khi duyệt.
- Bảng handover hoặc event-history mới ngoài baseline.

QR là thuộc tính nhận diện asset. QR immutable sau khi tạo và chứa frontend entry URL để mở tra cứu asset; không được hiểu thành module kiểm kê.
