# US-F02-06 – Quản lý danh mục asset

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **xem, tạo và cập nhật brand, type và model**,  
để **asset được phân loại thống nhất**.

## Acceptance Criteria

- AC-US-F02-06-01: Given user có quyền, when xem danh mục, then hệ thống hiển thị brand/type/model hiện có.
- AC-US-F02-06-02: Given dữ liệu hợp lệ và không trùng, when tạo danh mục, then hệ thống ghi nhận mục mới.
- AC-US-F02-06-03: Given mục tồn tại, when cập nhật hợp lệ, then hệ thống hiển thị giá trị mới.
- AC-US-F02-06-04: Given dữ liệu vi phạm ràng buộc duy nhất, then hệ thống từ chối.
- AC-US-F02-06-05: Hệ thống không hỗ trợ xóa brand/type/model đang được tham chiếu trong MVP.
- AC-US-F02-06-06: Asset type có prefix mã nội bộ do server chuẩn hóa; prefix rỗng/trùng bị từ chối, rename không đổi mã asset đã cấp.

## Business Rules áp dụng

`BR-AST-10`, `BR-AST-11`, `BR-AST-12`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F02-06`.
