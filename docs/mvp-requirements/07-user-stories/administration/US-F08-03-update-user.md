# US-F08-03 – Cập nhật user

## User Story

Là một **Admin**,  
tôi muốn **chỉnh sửa thông tin tài khoản nội bộ**,  
để **dữ liệu nhân sự luôn chính xác**.

## Acceptance Criteria

- AC-US-F08-03-01: Given user và department hợp lệ, when cập nhật, then hệ thống lưu thông tin mới, gồm avatar_url nếu có.
- AC-US-F08-03-02: Given email hoặc phone trùng user khác, then hệ thống từ chối.
- AC-US-F08-03-03: Given department không tồn tại, then hệ thống từ chối.
- AC-US-F08-03-04: Then kết quả không chứa mật khẩu.
- AC-US-F08-03-05: User không có chức năng tự cập nhật hồ sơ riêng trong MVP; thông tin user do Admin quản lý.

## Business Rules áp dụng

`BR-USR-01`, `BR-USR-02`.

## Functional Requirements liên quan

`FR-F08-03`.
