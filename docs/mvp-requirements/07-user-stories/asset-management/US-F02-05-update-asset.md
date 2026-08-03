# US-F02-05 – Cập nhật asset

## User Story

Là một **user có quyền quản lý asset**,  
tôi muốn **cập nhật thông tin và department quản lý tài sản**,  
để **dữ liệu phản ánh đúng hiện trạng quản lý**.

## Acceptance Criteria

- AC-US-F02-05-01: Given asset và dữ liệu tham chiếu hợp lệ, when cập nhật, then hệ thống lưu và hiển thị thông tin mới, gồm image_url nếu có.
- AC-US-F02-05-02: Given serial mới trùng asset khác, when cập nhật, then hệ thống từ chối.
- AC-US-F02-05-03: Given department/model không tồn tại, when cập nhật, then hệ thống từ chối.
- AC-US-F02-05-04: Thay đổi status nghiệp vụ không được thực hiện như một cập nhật thông tin thông thường.
- AC-US-F02-05-05: Given user thiếu quyền, then dữ liệu không thay đổi.

## Business Rules áp dụng

`BR-AST-01`, `BR-AST-06`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F02-05`.
