# FLOW-22 – Truy cập workspace theo permission

## Goal

Đi từ Dashboard hoặc navigation tới đúng khu vực nghiệp vụ mà user được cấp quyền.

## Actor

User đã đăng nhập.

## Related User Stories

`US-F01-04`; hỗ trợ entry cho `US-F02-01`, `US-F03-02`, `US-F04-01`, `US-F05-01`, `US-F06-02`, `US-F07-01`, `US-F08-01`.

## Preconditions

User có phiên hợp lệ; permission hiện hành đã được tải khi cấp/làm mới phiên.

## Main Flow

1. User vào `SCR-APP-01` sau login hoặc từ navigation chung.
2. Hệ thống tính hợp permission từ các role được gán trực tiếp.
3. Dashboard hiển thị shortcut/widget và Sidebar hiển thị menu cho capability tương ứng.
4. User chọn shortcut/menu.
5. Hệ thống mở screen đích và vẫn kiểm tra permission ở thao tác bảo vệ.

## Alternative Flows

- User có nhiều role nhìn thấy hợp các capability được gán; không chọn một role “cao nhất”.
- User chỉ có permission xem có thể vào list/detail nhưng không thấy action thay đổi dữ liệu.

## Error / Invalid States

- User truy cập trực tiếp screen/action thiếu permission: `SCR-SYS-02` ở trạng thái forbidden; không đổi dữ liệu.
- Permission thay đổi trong lifecycle phiên: phiên được refresh phản ánh permission hiện hành theo F01.

## Result

Navigation và Dashboard là permission-aware nhưng không thay backend authorization.

## Related Screens

`SCR-APP-01`, mọi protected screen, `SCR-SYS-02`.
