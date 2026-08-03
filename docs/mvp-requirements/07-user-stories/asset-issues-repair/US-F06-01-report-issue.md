# US-F06-01 – Báo sự cố

## User Story

Là một **user thuộc đối tượng được phép báo sự cố**,  
tôi muốn **ghi nhận vấn đề của một asset**,  
để **người phụ trách có thể xác minh và xử lý**.

## Acceptance Criteria

- AC-US-F06-01-01: Given asset hợp lệ và mô tả có giá trị, when gửi báo cáo, then issue được tạo ở `REPORTED`.
- AC-US-F06-01-02: Then hệ thống ghi người báo và thời điểm tạo.
- AC-US-F06-01-03: Then asset chưa tự chuyển sang `DAMAGED`.
- AC-US-F06-01-04: Given asset không tồn tại, when báo, then hệ thống từ chối.
- AC-US-F06-01-05: Người đang mượn chỉ được báo issue cho asset mình đang mượn; user có permission issue được báo theo phạm vi được cấp.

## Business Rules áp dụng

`BR-ISS-01`, `BR-AST-04`.

## Functional Requirements liên quan

`FR-F06-01`.
