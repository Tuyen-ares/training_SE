# US-F02-06 – Quản lý danh mục asset

## User Story

Là một **user có quyền quản lý danh mục asset**,  
tôi muốn **xem, tạo và cập nhật brand, type và model**,  
để **asset được phân loại thống nhất**.

## Acceptance Criteria

- AC-US-F02-06-01: Given user có quyền, when xem danh mục, then hệ thống hiển thị brand/type/model hiện có.
- AC-US-F02-06-02: Given dữ liệu hợp lệ và không trùng, when tạo danh mục, then hệ thống ghi nhận mục mới.
- AC-US-F02-06-03: Given mục tồn tại, when cập nhật hợp lệ, then hệ thống hiển thị giá trị mới.
- AC-US-F02-06-04: Given dữ liệu vi phạm ràng buộc duy nhất, then hệ thống từ chối.
- AC-US-F02-06-05: Hệ thống không hỗ trợ xóa brand/type/model đang được tham chiếu trong MVP.

## Business Rules áp dụng

`BR-AST-10`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F02-06`.
