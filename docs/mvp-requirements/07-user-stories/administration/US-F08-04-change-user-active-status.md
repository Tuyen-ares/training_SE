# US-F08-04 – Kích hoạt hoặc vô hiệu hóa user

## User Story

Là một **Admin**,  
tôi muốn **kích hoạt hoặc vô hiệu hóa tài khoản**,  
để **kiểm soát quyền truy cập mà vẫn giữ lịch sử nghiệp vụ**.

## Acceptance Criteria

- AC-US-F08-04-01: Given user active, when vô hiệu hóa hợp lệ, then user thành inactive.
- AC-US-F08-04-02: Then user inactive không thể đăng nhập hoặc refresh phiên mới.
- AC-US-F08-04-03: Then request, history, issue và dữ liệu liên quan của user vẫn được giữ.
- AC-US-F08-04-04: Given user inactive, when kích hoạt lại hợp lệ, then user có thể đăng nhập bằng thông tin hợp lệ.
- AC-US-F08-04-05: Given thiếu permission, then trạng thái user không thay đổi.

## Business Rules áp dụng

`BR-USR-03`, `BR-AUTH-01`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F08-04`, `FR-F08-07`.
