# US-F05-05 – Xem toàn bộ lịch sử mượn

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **tra cứu lịch sử mượn/trả trong phạm vi được cấp**,  
để **hỗ trợ quản lý và đối chiếu tài sản**.

## Acceptance Criteria

- AC-US-F05-05-01: Given có permission, when mở lịch sử, then hệ thống hiển thị các bản ghi thuộc phạm vi được phép.
- AC-US-F05-05-02: Then có thể nhận biết người mượn qua phiếu, người bàn giao và người nhận trả.
- AC-US-F05-05-03: Given thiếu permission xem toàn bộ, then user không truy cập được lịch sử của người khác.
- AC-US-F05-05-04: Dữ liệu hiển thị phản ánh history đã ghi, không suy ra bàn giao chỉ từ approval status.

## Business Rules áp dụng

`BR-HAN-03`, `BR-HAN-05`, `BR-HAN-06`, `BR-RET-01`.

## Functional Requirements liên quan

`FR-F05-05`.
