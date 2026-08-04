# US-F06-03 – Xác minh issue

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **xác nhận hoặc từ chối báo cáo đang chờ**,  
để **chỉ sự cố có thật mới ảnh hưởng trạng thái asset**.

## Acceptance Criteria

- AC-US-F06-03-01: Given issue `REPORTED`, when xác nhận, then issue thành `CONFIRMED` và asset thành `DAMAGED`.
- AC-US-F06-03-02: Given issue `REPORTED`, when từ chối, then issue thành `REJECTED` và asset không chuyển sang `DAMAGED` do issue đó.
- AC-US-F06-03-03: Then hệ thống ghi người xử lý và thời điểm cập nhật phù hợp dữ liệu baseline.
- AC-US-F06-03-04: Given issue không còn `REPORTED`, when xác minh lại, then hệ thống từ chối.
- AC-US-F06-03-05: Given cập nhật issue hoặc asset thất bại, then không lưu trạng thái một phần.
- AC-US-F06-03-06: Given asset được xác nhận hỏng ngay lúc trả, then history đã ghi return, issue là `CONFIRMED` và asset là `DAMAGED`.

## Business Rules áp dụng

`BR-ISS-01`, `BR-ISS-02`, `BR-ISS-03`, `BR-ISS-08`.

## Functional Requirements liên quan

`FR-F06-03`, `FR-F06-04`.
