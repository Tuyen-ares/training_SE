# US-F06-04 – Bắt đầu sửa chữa

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **bắt đầu xử lý một issue đã xác nhận**,  
để **theo dõi asset đang trong quá trình sửa**.

## Acceptance Criteria

- AC-US-F06-04-01: Given issue `CONFIRMED` và asset `DAMAGED`, when bắt đầu sửa, then issue và asset cùng chuyển `IN_REPAIR`.
- AC-US-F06-04-02: Then hệ thống ghi người xử lý và ngày bắt đầu phù hợp thông tin được cung cấp.
- AC-US-F06-04-03: Given issue hoặc asset không đúng trạng thái nguồn, then hệ thống từ chối.
- AC-US-F06-04-04: Given một cập nhật thất bại, then issue và asset giữ trạng thái cũ.

## Business Rules áp dụng

`BR-ISS-03`, `BR-ISS-04`.

## Functional Requirements liên quan

`FR-F06-05`.
