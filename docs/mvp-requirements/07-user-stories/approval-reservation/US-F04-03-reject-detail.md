# US-F04-03 – Từ chối một detail

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **từ chối một asset đang chờ và ghi lý do**,  
để **người yêu cầu hiểu quyết định xử lý**.

## Acceptance Criteria

- AC-US-F04-03-01: Given detail `PENDING`, when từ chối với lý do hợp lệ, then detail thành `REJECTED`.
- AC-US-F04-03-02: Then hệ thống ghi người, thời điểm và lý do từ chối.
- AC-US-F04-03-03: Given thiếu lý do, when từ chối dữ liệu mới, then hệ thống không hoàn tất thao tác.
- AC-US-F04-03-04: Given detail không còn `PENDING`, then hệ thống từ chối xử lý lại.
- AC-US-F04-03-05: Then asset không bị chuyển status do thao tác từ chối một detail chưa được duyệt.

## Business Rules áp dụng

`BR-BOR-03`, `BR-BOR-04`, `BR-BOR-13`, `BR-BOR-14`, `BR-BOR-15`.

## Functional Requirements liên quan

`FR-F04-03`, `FR-F04-05`.
