# US-F04-01 – Xem phiếu cần xử lý

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **xem các phiếu và detail cần xem xét**,  
để **thực hiện duyệt hoặc từ chối đúng đối tượng**.

## Acceptance Criteria

- AC-US-F04-01-01: Given có permission, when mở danh sách, then hệ thống hiển thị các phiếu thuộc phạm vi được phép.
- AC-US-F04-01-02: Then hệ thống thể hiện trạng thái tổng và trạng thái từng detail.
- AC-US-F04-01-03: Then user có thể nhận biết detail nào còn `PENDING`.
- AC-US-F04-01-04: Given thiếu permission xem toàn bộ, then hệ thống không cung cấp dữ liệu của người khác.

## Business Rules áp dụng

`BR-BOR-03`, `BR-BOR-04`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F04-01`.
