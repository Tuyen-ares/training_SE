# US-F06-06 – Kết thúc sửa chữa

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **ghi nhận kết quả cuối của việc sửa**,  
để **asset có trạng thái vận hành phù hợp với kết quả**.

## Acceptance Criteria

- AC-US-F06-06-01: Given issue và asset `IN_REPAIR`, when sửa thành công, then issue thành `COMPLETED` và asset thành `AVAILABLE`.
- AC-US-F06-06-02: Then hệ thống ghi thời điểm kết thúc và kết quả sửa.
- AC-US-F06-06-03: Given issue không ở `IN_REPAIR`, when kết thúc, then hệ thống từ chối.
- AC-US-F06-06-04: Given cập nhật issue hoặc asset thất bại, then không lưu trạng thái một phần.
- AC-US-F06-06-05: Khi sửa thất bại, issue thành `FAILED` và asset chuyển `IN_REPAIR → DAMAGED`; không tự chuyển `RETIRED`.

## Business Rules áp dụng

`BR-ISS-03`, `BR-ISS-05`, `BR-ISS-06`, `BR-ISS-07`.

## Functional Requirements liên quan

`FR-F06-07`, `FR-F06-08`.
