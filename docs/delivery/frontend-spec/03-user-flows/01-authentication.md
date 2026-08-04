# FLOW-01 – Đăng nhập và vào workspace

## Goal

Xác thực user nội bộ và đưa họ đến Dashboard chung.

## Actor

User có tài khoản.

## Related User Stories

`US-F01-01..04`.

## Preconditions

User chưa có phiên hợp lệ và có tài khoản active.

## Main Flow

1. User mở `SCR-SYS-01` và nhập email, mật khẩu.
2. User gửi thông tin đăng nhập.
3. Hệ thống xác thực, tạo phiên và tải permission hiện hành.
4. Hệ thống mở `SCR-APP-01`; chỉ widget/menu được phép mới xuất hiện.

## Alternative Flows

- Khi quay lại app có refresh token hợp lệ, hệ thống làm mới phiên rồi mở Dashboard.
- User chọn logout từ header; hệ thống kết thúc khả năng refresh và quay lại Login.

## Error / Invalid States

- Email/mật khẩu không đúng: thông báo xác thực chung, không tiết lộ phần nào sai.
- User inactive hoặc refresh token không hợp lệ: không tạo phiên, quay về Login.
- User cố mở hành vi không được cấp permission: hiển thị `SCR-SYS-02`.

## Result

User có phiên hợp lệ và workspace phản ánh hợp permission của các role được gán.

## Related Screens

`SCR-SYS-01`, `SCR-APP-01`, `SCR-SYS-02`.

---

# FLOW-02 – Đăng ký và xét duyệt tài khoản

## Goal

Cho phép guest gửi yêu cầu đăng ký; chỉ reviewer có permission mới có thể cấp account sau khi đánh giá.

## Actor

Guest; user có permission `user_registration.review`.

## Related User Stories

`US-F01-05`.

## Main Flow

1. Guest mở `SCR-SYS-03` từ Login và nhập họ tên, email, số điện thoại, mật khẩu.
2. Guest gửi form mà không chọn role hoặc department.
3. Hệ thống tạo yêu cầu `PENDING` và trả về thông báo chờ xét duyệt; guest không nhận phiên đăng nhập.
4. Reviewer mở queue xét duyệt, chọn department hoặc để trống và chọn role có sẵn hoặc giữ role mặc định `employee`.
5. Reviewer duyệt hoặc từ chối. Chỉ yêu cầu được duyệt mới tạo account active có thể đăng nhập.

## Error / Invalid States

- Field không hợp lệ hoặc email/số điện thoại đã tồn tại: hiển thị lỗi cụ thể ở field, không tạo yêu cầu.
- Guest không thể tự chọn role hoặc department.
- User không có `user_registration.review` không thể xem hoặc xử lý request của người khác.

## Related Screens

`SCR-SYS-01`, `SCR-SYS-03`; registration review queue sẽ được bổ sung trong F08 khi backend workflow được triển khai.
