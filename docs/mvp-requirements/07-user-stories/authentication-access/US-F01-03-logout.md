# US-F01-03 – Đăng xuất

## User Story

Là một **user đã đăng nhập**,  
tôi muốn **đăng xuất khỏi phiên hiện tại**,  
để **ngăn phiên đó tiếp tục truy cập tài khoản của tôi**.

## Acceptance Criteria

- AC-US-F01-03-01: Given phiên hợp lệ, when logout, then hệ thống xác nhận đăng xuất.
- AC-US-F01-03-02: When refresh lại bằng thông tin phiên đã logout, then hệ thống từ chối.
- AC-US-F01-03-03: Given phiên đã hết hạn hoặc đã logout, when logout lại, then không tạo phiên mới và không làm thay đổi dữ liệu nghiệp vụ.

## Business Rules áp dụng

`BR-AUTH-04`.

## Functional Requirements liên quan

`FR-F01-04`.
