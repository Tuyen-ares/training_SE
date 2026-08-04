# US-F05-02 – Xem tài sản đang mượn

## User Story

Là một **Employee**,  
tôi muốn **xem các asset hiện đang được bàn giao cho mình**,  
để **biết trách nhiệm hoàn trả hiện tại**.

## Acceptance Criteria

- AC-US-F05-02-01: When mở danh sách đang mượn, then hệ thống chỉ hiển thị history thuộc request của user hiện tại chưa hoàn trả.
- AC-US-F05-02-02: Then mỗi dòng hiển thị asset, ngày bàn giao và ngày trả dự kiến.
- AC-US-F05-02-03: Detail chỉ `APPROVED` nhưng chưa có bàn giao không được coi là đang mượn.
- AC-US-F05-02-04: Asset đã có return date không còn xuất hiện trong danh sách đang mượn.

## Business Rules áp dụng

`BR-HAN-03`, `BR-HAN-06`.

## Functional Requirements liên quan

`FR-F05-03`.
