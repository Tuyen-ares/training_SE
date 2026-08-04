# US-F07-02 – Đánh dấu đã đọc

## User Story

Là một **Employee, Asset Manager hoặc Admin**,  
tôi muốn **đánh dấu notification của mình đã đọc**,  
để **phân biệt nội dung đã xem và chưa xem**.

## Acceptance Criteria

- AC-US-F07-02-01: Given notification chưa đọc thuộc user, when đánh dấu, then status thành đã đọc và ghi thời điểm đọc.
- AC-US-F07-02-02: Then số lượng chưa đọc giảm tương ứng.
- AC-US-F07-02-03: Given notification đã đọc, when đánh dấu lại, then hệ thống không tạo trạng thái mâu thuẫn.
- AC-US-F07-02-04: Given notification thuộc user khác, then hệ thống từ chối và không thay đổi dữ liệu.

## Business Rules áp dụng

`BR-NOT-02`, `BR-NOT-03`.

## Functional Requirements liên quan

`FR-F07-02`, `FR-F07-03`.
