# US-F08-02 – Tạo user

## User Story

Là một **Admin**,  
tôi muốn **tạo tài khoản nội bộ**,  
để **nhân sự có thể truy cập hệ thống theo vai trò được cấp**.

## Acceptance Criteria

- AC-US-F08-02-01: Given dữ liệu bắt buộc và department hợp lệ, when tạo, then hệ thống tạo user active; avatar_url là tùy chọn.
- AC-US-F08-02-02: Given email hoặc phone đã tồn tại, then hệ thống từ chối.
- AC-US-F08-02-03: Given department không tồn tại, then hệ thống từ chối.
- AC-US-F08-02-04: Then mật khẩu không được trả lại trong kết quả.
- AC-US-F08-02-05: Given thiếu permission, then không tạo user.

## Business Rules áp dụng

`BR-USR-01`, `BR-USR-02`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F08-02`, `FR-F08-07`.
