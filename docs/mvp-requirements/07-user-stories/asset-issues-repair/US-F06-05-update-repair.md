# US-F06-05 – Cập nhật quá trình sửa

## User Story

Là một **user có quyền quản lý sửa chữa**,  
tôi muốn **cập nhật thông tin quá trình xử lý**,  
để **chi phí, đơn vị sửa và tiến độ được theo dõi tập trung**.

## Acceptance Criteria

- AC-US-F06-05-01: Given issue đang ở giai đoạn cho phép, when cập nhật hợp lệ, then hệ thống lưu thông tin mới.
- AC-US-F06-05-02: Thông tin có thể gồm đơn vị sửa, ngày bắt đầu/kết thúc, chi phí, kết quả và ghi chú theo baseline.
- AC-US-F06-05-03: Given chi phí hoặc thời gian không hợp lệ, then hệ thống từ chối và giữ dữ liệu cũ.
- AC-US-F06-05-04: Given user thiếu permission, then hệ thống không thay đổi issue.

## Business Rules áp dụng

`BR-ISS-03`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F06-06`.
