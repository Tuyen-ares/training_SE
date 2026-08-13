# US-F02-02 – Xem chi tiết asset

## User Story

Là một **Employee, Asset Manager hoặc Admin**,  
tôi muốn **xem chi tiết một tài sản**,  
để **biết chính xác định danh, phân loại, department và trạng thái của nó**.

## Acceptance Criteria

- AC-US-F02-02-01: Given asset tồn tại và user có quyền, when mở chi tiết, then hệ thống hiển thị thông tin asset.
- AC-US-F02-02-02: Then thông tin gồm asset code read-only, model, brand, type, serial, QR, department và status hiện tại khi có dữ liệu.
- AC-US-F02-02-03: Given asset không tồn tại, when yêu cầu xem, then hệ thống báo không tìm thấy.
- AC-US-F02-02-04: Given user thiếu quyền, then hệ thống không tiết lộ chi tiết asset.

## Business Rules áp dụng

`BR-AST-01`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F02-02`.
