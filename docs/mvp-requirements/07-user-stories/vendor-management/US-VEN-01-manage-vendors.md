# US-VEN-01 – Quản lý shared vendor

## User Story

Là user có permission Vendor phù hợp, tôi muốn quản lý danh mục vendor dùng
chung để chọn vendor cho repair và giữ lịch sử khi vendor ngừng hợp tác.

## Acceptance Criteria

- Có thể search, phân trang và lọc Active/Inactive với `vendor.view`.
- Có thể tạo vendor active với `vendor.create`; contact rỗng được lưu thành
  `null`.
- Có thể sửa thông tin và activate/deactivate bằng `vendor.update`.
- Vendor inactive không xuất hiện trong repair selector mặc định nhưng vẫn hiện
  trong Vendor Management và issue history.
- Không có thao tác delete vendor trong MVP; vendor không còn hợp tác được
  deactivate để giữ record và lịch sử issue.
- Runtime chỉ kiểm tra permission code, không suy ra quyền từ tên role.
