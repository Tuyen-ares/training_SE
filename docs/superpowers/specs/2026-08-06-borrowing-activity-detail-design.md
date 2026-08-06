# Borrowing Activity Detail – MVP Design

## Mục tiêu

Cho phép người dùng mở một bản ghi trong Borrowing Activity và xem đầy đủ thông tin mượn/trả đã được lưu. Màn hình dùng chung cho mọi người dùng; phạm vi dữ liệu do permission quyết định.

## Phạm vi dữ liệu

- Request ID, ngày tạo và lý do mượn.
- Asset: ảnh, model, serial/QR, trạng thái và ngày trả dự kiến.
- Approval: trạng thái detail, người duyệt, thời điểm duyệt và lý do từ chối nếu có.
- Handover: người bàn giao và thời điểm bàn giao.
- Return: người tiếp nhận, thời điểm trả và tình trạng trả nếu đã hoàn trả.
- Người mượn/requester theo phạm vi quyền.

Không thêm `Related Project`, `Pickup Instruction`, `Approval Note`, purchase date hoặc lifecycle legacy vì các trường này chưa có trong baseline MVP.

## Quyền truy cập

- `borrow_history.view_own`: chỉ được đọc history thuộc request của chính user.
- `borrow_history.view_all`: được đọc history trong phạm vi toàn hệ thống hiện tại.
- Không kiểm tra theo tên role; backend là nơi quyết định phạm vi.
- Frontend chỉ hiển thị link/nút phù hợp nhưng không thay thế kiểm tra backend.

## Luồng

1. Borrowing Activity tải danh sách `CURRENT` hoặc `RETURNED` theo permission.
2. Mỗi dòng có `View Details`.
3. Frontend mở route `/borrowing-activity/:id`.
4. Backend trả một history detail sau khi kiểm tra `view_own` hoặc `view_all`.
5. Nếu không thuộc phạm vi, trả lỗi forbidden/not found an toàn.

## API dự kiến

`GET /borrow-histories/:id`

Response gồm history, request, requester, asset, approval metadata và return metadata. Không thay đổi database schema.

## Frontend

- Tạo view detail dùng chung, không tạo bản riêng cho Employee/Manager/Admin.
- Reuse `WorkspaceLayout` và visual language hiện tại.
- Có loading, error, forbidden/not-found và back về Borrowing Activity.
- Không thêm thao tác chỉnh sửa history từ màn hình xem.

## Kiểm thử

- Employee xem được history của mình.
- Employee không xem được history của user khác.
- User có `borrow_history.view_all` xem được history ngoài request của mình.
- Detail hiện đúng approval/handover/return metadata.
- History chưa trả và đã trả có trạng thái khác nhau.
- Không làm lộ dữ liệu khi truy cập history không hợp lệ.
