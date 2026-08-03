# US-F05-01 – Xác nhận bàn giao

## User Story

Là một **user có quyền bàn giao**,  
tôi muốn **xác nhận đã giao asset được giữ chỗ**,  
để **ghi nhận người mượn đã thực sự nhận thiết bị**.

## Acceptance Criteria

- AC-US-F05-01-01: Given detail `APPROVED` và asset `RESERVED` cho đúng detail, when xác nhận, then asset chuyển `BORROWED`.
- AC-US-F05-01-02: Then hệ thống tạo một borrow history ghi người và thời điểm bàn giao.
- AC-US-F05-01-03: Given detail đã có borrow history, when xác nhận lại, then hệ thống từ chối tạo lịch sử thứ hai.
- AC-US-F05-01-04: Given asset không còn `RESERVED` cho detail, then không có history hoặc status nào bị ghi một phần.
- AC-US-F05-01-05: Người mượn được xác định từ request, không yêu cầu nhập lại.

## Business Rules áp dụng

`BR-HAN-01`, `BR-HAN-02`, `BR-HAN-03`, `BR-HAN-04`, `BR-HAN-05`, `BR-HAN-06`.

## Functional Requirements liên quan

`FR-F05-01`, `FR-F05-02`.
