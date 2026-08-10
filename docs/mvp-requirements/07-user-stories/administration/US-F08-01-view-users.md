# US-F08-01 – Xem danh sách user

## User Story

Là một **Admin**,  
tôi muốn **xem và tìm tài khoản trong công ty**,  
để **thực hiện quản trị đúng người dùng**.

## Acceptance Criteria

- AC-US-F08-01-01: Given có permission, when mở danh sách, then hệ thống hiển thị user code cùng user và trạng thái active.
- AC-US-F08-01-02: Then có thể tìm theo user code và các thông tin được hỗ trợ.
- AC-US-F08-01-03: Then dữ liệu không chứa mật khẩu hoặc hash mật khẩu.
- AC-US-F08-01-04: Given thiếu permission, then hệ thống từ chối truy cập.

## Business Rules áp dụng

`BR-USR-02`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F08-01`, `FR-F08-07`.
