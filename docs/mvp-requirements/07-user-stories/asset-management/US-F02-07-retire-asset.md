# US-F02-07 – Ngừng sử dụng asset

## User Story

Là một **user có thẩm quyền**,  
tôi muốn **chuyển tài sản không còn phù hợp sang ngừng sử dụng**,  
để **ngăn tài sản tiếp tục tham gia nghiệp vụ vận hành**.

## Acceptance Criteria

- AC-US-F02-07-01: Given user có permission phù hợp và asset ở `AVAILABLE`, `DAMAGED` hoặc `IN_REPAIR`, when ngừng sử dụng hợp lệ, then asset chuyển `RETIRED`.
- AC-US-F02-07-02: Given asset `RETIRED`, then asset không xuất hiện trong danh sách có thể mượn.
- AC-US-F02-07-03: Given asset `RETIRED`, when yêu cầu transition nghiệp vụ mới, then hệ thống từ chối.
- AC-US-F02-07-04: Given asset ở `RESERVED` hoặc `BORROWED`, when ngừng sử dụng, then hệ thống từ chối.

## Business Rules áp dụng

`BR-AST-07`, `BR-ISS-06`.

## Functional Requirements liên quan

`FR-F02-08`.
