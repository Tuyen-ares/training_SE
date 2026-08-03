# US-F02-08 – Tra cứu asset bằng QR

## User Story

Là một **user có quyền xem asset**,  
tôi muốn **quét QR của thiết bị**,  
để **mở nhanh trang chi tiết đúng asset**.

## Acceptance Criteria

- AC-US-F02-08-01: Given QR hợp lệ và user có quyền xem, when quét, then hệ thống mở chi tiết asset tương ứng.
- AC-US-F02-08-02: Given QR không tồn tại, then hệ thống báo không tìm thấy asset.
- AC-US-F02-08-03: Quét QR không tạo inventory session, không ghi kết quả kiểm kê và không đổi status asset.
- AC-US-F02-08-04: Given user thiếu quyền xem asset, then hệ thống từ chối chi tiết.

## Business Rules áp dụng

`BR-AST-05`, `BR-AST-09`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F02-09`.
