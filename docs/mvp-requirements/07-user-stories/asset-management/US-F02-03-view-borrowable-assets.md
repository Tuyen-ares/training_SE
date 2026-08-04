# US-F02-03 – Xem asset có thể yêu cầu mượn

## User Story

Là một **Employee**,  
tôi muốn **xem các asset đang đủ điều kiện yêu cầu mượn**,  
để **chọn thiết bị phù hợp cho phiếu của mình**.

## Acceptance Criteria

- AC-US-F02-03-01: When mở danh sách có thể yêu cầu, then chỉ asset có status `AVAILABLE` được hiển thị.
- AC-US-F02-03-02: Then asset `RESERVED`, `BORROWED`, `DAMAGED`, `IN_REPAIR`, `RETIRED` không được chọn.
- AC-US-F02-03-03: Given nhiều request khác đang `PENDING` cho một asset còn `AVAILABLE`, then asset đó vẫn có thể được chọn.
- AC-US-F02-03-04: Nhân viên được xem asset đủ điều kiện mượn trên toàn công ty; department chỉ thể hiện đơn vị quản lý.

## Business Rules áp dụng

`BR-AST-01`, `BR-AST-02`, `BR-AST-08`, `BR-BOR-05`.

## Functional Requirements liên quan

`FR-F02-03`.
