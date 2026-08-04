# F04 – Approval & Reservation

## Mục tiêu

Duyệt/từ chối từng asset và giữ chỗ an toàn, kể cả khi nhiều người cùng yêu cầu một asset.

## Actors

User có permission xem và xử lý yêu cầu.

## User Stories

- US-F04-01 – Xem phiếu cần xử lý.
- US-F04-02 – Duyệt một detail.
- US-F04-03 – Từ chối một detail.
- US-F04-04 – Duyệt tất cả theo partial success.

## Business Rules áp dụng

`BR-BOR-03..15`, `BR-AST-01..04`, `BR-RBAC-01..03`.

## Functional Requirements liên quan

`FR-F04-01..06`.

## Dependencies

F01, F02 và F03; tạo đầu vào cho F05.

## Out of Scope

Duyệt ở cấp header, SLA duyệt, tự hết hạn reservation.
