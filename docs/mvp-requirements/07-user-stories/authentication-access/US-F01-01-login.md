# US-F01-01 – Đăng nhập

## User Story

Là một **Employee, Asset Manager hoặc Admin**,  
tôi muốn **đăng nhập bằng thông tin xác thực của mình**,  
để **truy cập các chức năng được cấp quyền**.

## Acceptance Criteria

- AC-US-F01-01-01: Given tài khoản active và thông tin đúng, when đăng nhập, then hệ thống xác thực thành công và tạo phiên.
- AC-US-F01-01-02: Given email hoặc mật khẩu sai, when đăng nhập, then hệ thống từ chối bằng thông báo xác thực chung.
- AC-US-F01-01-03: Given tài khoản inactive, when đăng nhập, then hệ thống không tạo phiên.
- AC-US-F01-01-04: Then dữ liệu trả về không chứa mật khẩu hoặc hash mật khẩu.

## Business Rules áp dụng

`BR-AUTH-01`, `BR-AUTH-02`, `BR-USR-02`.

## Functional Requirements liên quan

`FR-F01-01`, `FR-F01-02`.
