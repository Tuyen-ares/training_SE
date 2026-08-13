# F01 – Authentication & Access

## Mục tiêu

Bảo đảm chỉ user hợp lệ truy cập hệ thống và mọi hành vi được giới hạn bằng permission.

## Actors

User đã có tài khoản; Hệ thống.

## User Stories

- US-F01-01 – Đăng nhập.
- US-F01-02 – Làm mới phiên.
- US-F01-03 – Đăng xuất.
- US-F01-04 – Truy cập theo permission.
- US-F01-05 – Đăng ký và xét duyệt tài khoản.
- US-F01-06 – Xét duyệt yêu cầu đăng ký.

## Business Rules áp dụng

`BR-AUTH-01..08`, `BR-RBAC-01..07`.

## Functional Requirements liên quan

`FR-F01-01..07`.

## Dependencies

User, role, permission và refresh token thuộc baseline.

## Out of Scope

SSO, social login, role inheritance.
