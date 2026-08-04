# US-F05-03 – Xác nhận hoàn trả

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **xác nhận asset được hoàn trả**,  
để **kết thúc lượt mượn và đưa thiết bị về khả dụng**.

## Acceptance Criteria

- AC-US-F05-03-01: Given asset `BORROWED` có history chưa trả, when xác nhận trả bình thường, then ghi người nhận, thời điểm và tình trạng trả.
- AC-US-F05-03-02: Then asset chuyển `BORROWED → AVAILABLE`.
- AC-US-F05-03-03: Given history đã có return date, when xác nhận lại, then hệ thống từ chối.
- AC-US-F05-03-04: Given lỗi ở bất kỳ cập nhật nào, then history và asset không bị lưu trạng thái một phần.
- AC-US-F05-03-05: Khi mọi lượt được duyệt/bàn giao trong phiếu đã trả, header chuyển `COMPLETED`.
- AC-US-F05-03-06: Given người nhận xác nhận tình trạng `DAMAGED`, when hoàn trả, then history ghi `return_date` và `return_condition = DAMAGED`, issue `CONFIRMED` được tạo và asset chuyển `BORROWED → DAMAGED`.

## Business Rules áp dụng

`BR-RET-01`, `BR-RET-02`, `BR-RET-03`, `BR-BOR-18`, `BR-ISS-08`.

## Functional Requirements liên quan

`FR-F05-04`, `FR-F04-05`.

## Notes / Out of Scope

Trường hợp hỏng lúc trả tạo issue `CONFIRMED`; không giữ asset ở `BORROWED` sau khi đã ghi nhận hoàn trả.
