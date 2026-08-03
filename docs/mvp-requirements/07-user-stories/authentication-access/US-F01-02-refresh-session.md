# US-F01-02 – Làm mới phiên

## User Story

Là một **user đã đăng nhập**,  
tôi muốn **làm mới phiên hợp lệ**,  
để **tiếp tục làm việc mà không phải đăng nhập lại liên tục**.

## Acceptance Criteria

- AC-US-F01-02-01: Given refresh token còn hợp lệ, when yêu cầu làm mới, then hệ thống cấp phiên truy cập mới.
- AC-US-F01-02-02: Given refresh token đã dùng, bị thu hồi hoặc hết hạn, when làm mới, then hệ thống từ chối.
- AC-US-F01-02-03: Given user đã inactive, when làm mới, then hệ thống từ chối cấp phiên mới.
- AC-US-F01-02-04: Then phiên mới phản ánh permission hiện hành tại thời điểm cấp.

## Business Rules áp dụng

`BR-AUTH-01`, `BR-AUTH-03`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F01-02`, `FR-F01-03`.
