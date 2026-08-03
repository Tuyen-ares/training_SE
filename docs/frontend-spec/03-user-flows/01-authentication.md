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
