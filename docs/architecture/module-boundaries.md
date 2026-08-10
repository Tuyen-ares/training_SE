# Ranh giới module

File này là bản đồ ownership chuẩn của hệ thống. Luật phụ thuộc bắt buộc nằm trong
[`constitution.md`](constitution.md).

| Module | Dữ liệu sở hữu | Phụ thuộc công khai |
|---|---|---|
| Auth | `refresh_tokens` | Users để xác thực tài khoản; RBAC để lấy quyền |
| Users | `users`, `departments` | RBAC khi gán role; Auth khi thu hồi phiên của user |
| RBAC | `roles`, `permissions`, `role_permissions`, `user_roles` | Users để xác nhận user |
| Asset | `assets`, `asset_models`, `asset_types`, `brands` | Không |
| Borrow | `borrow_requests`, `borrow_request_details`, `borrow_histories` | Users, Asset |
| Asset Issues & Repair | `asset_issues` | Users, Asset |
| Notification (target) | `notifications`; sau này có thể thêm `notification_deliveries` | Domain events từ các module nghiệp vụ; Users public query để lấy người nhận/email |

## Quy tắc ownership

- Chỉ repository của module sở hữu được query/update trực tiếp bảng của module đó.
- Module khác gọi public service của owner, không import Prisma repository của owner.
- Chỉ Asset service thay đổi `assets.status`.
- Chỉ RBAC service thay đổi `user_roles` và `role_permissions`.
- Use case nhiều module truyền cùng `Prisma.TransactionClient` qua public service theo
  quy tắc transaction trong constitution.

Asset Catalog và Asset Inventory là hai khu vực trong cùng module Asset ở giai đoạn
hiện tại; chưa tách thành hai module độc lập.

Notification không được query trực tiếp bảng nghiệp vụ của Borrow, Repair hoặc Asset.
Nó chỉ nhận payload event chuẩn. Khi cần thông tin người nhận, Notification gọi public
query/application port của Users; không import Users Prisma repository.

Hạ tầng event (không phải module Notification) sở hữu `outbox_events` nếu Phase 3
được triển khai.
