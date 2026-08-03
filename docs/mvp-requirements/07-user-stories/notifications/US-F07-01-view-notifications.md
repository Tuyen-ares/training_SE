# US-F07-01 – Xem notification

## User Story

Là một **user**,  
tôi muốn **xem notification liên quan đến mình**,  
để **không bỏ lỡ thay đổi nghiệp vụ quan trọng**.

## Acceptance Criteria

- AC-US-F07-01-01: When mở danh sách, then hệ thống chỉ hiển thị notification của user hiện tại.
- AC-US-F07-01-02: Then notification được sắp theo thời gian mới nhất trước.
- AC-US-F07-01-03: Then mỗi notification thể hiện tiêu đề, nội dung, thời điểm và trạng thái đọc.
- AC-US-F07-01-04: Then hệ thống hiển thị số lượng notification chưa đọc.
- AC-US-F07-01-05: Notification được tạo trong hệ thống cho request, approval, issue, handover và return event; recipient được xác định theo user/permission và entity liên quan.

## Business Rules áp dụng

`BR-NOT-02`, `BR-NOT-04`, `BR-NOT-05`.

## Functional Requirements liên quan

`FR-F07-01`, `FR-F07-02`, `FR-F07-05`.
