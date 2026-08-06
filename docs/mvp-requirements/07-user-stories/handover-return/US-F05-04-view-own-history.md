# US-F05-04 – Xem lịch sử mượn của tôi

## User Story

Là một **Employee**,  
tôi muốn **xem lịch sử các asset mình đã mượn và trả**,  
để **đối chiếu quá trình sử dụng thiết bị của bản thân**.

## Acceptance Criteria

- AC-US-F05-04-01: When mở lịch sử của tôi, then chỉ các history truy về request của user hiện tại được hiển thị.
- AC-US-F05-04-02: Then mỗi history thể hiện asset, ngày bàn giao, ngày trả và tình trạng trả khi có.
- AC-US-F05-04-03: History chưa trả được phân biệt rõ với history đã hoàn trả.
- AC-US-F05-04-04: User không thể đổi dữ liệu history từ chức năng xem.
- AC-US-F05-04-05: Khi mở detail của history, user thấy lý do mượn, người/ngày duyệt, người/ngày bàn giao và thông tin trả nếu đã hoàn trả.

## Business Rules áp dụng

`BR-HAN-03`, `BR-HAN-06`, `BR-RET-03`.

## Functional Requirements liên quan

`FR-F05-05`.
