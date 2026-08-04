# Actors

## Nhân viên

- Đăng nhập và sử dụng các chức năng được cấp quyền.
- Xem asset đủ điều kiện, tạo/xem/thu hồi phiếu của mình.
- Xem từng detail, asset đang mượn và lịch sử của mình.
- Báo sự cố cho asset mình đang mượn; user có permission issue được báo trong phạm vi được cấp.
- Xem và đánh dấu thông báo của mình.

## Người quản lý

Khi có permission tương ứng, có thể quản lý asset, xem yêu cầu, duyệt/từ chối từng detail, Approve All, bàn giao, nhận trả và xử lý issue/sửa chữa.

## Quản trị viên

Quản lý user và gán/gỡ các role có sẵn. Admin không mặc nhiên có quyền của Manager; muốn thực hiện nghiệp vụ phải được gán permission tương ứng.

## Hệ thống

Tự suy ra trạng thái tổng, bảo vệ ràng buộc trạng thái, ghi lịch sử và tạo notification cho các event đã chốt.

## Mô hình truy cập

`users → user_roles → roles → role_permissions → permissions`. Không có role hierarchy hoặc role inheritance. Backend là nơi quyết định quyền cuối cùng; việc ẩn thao tác ở giao diện chỉ hỗ trợ trải nghiệm.
