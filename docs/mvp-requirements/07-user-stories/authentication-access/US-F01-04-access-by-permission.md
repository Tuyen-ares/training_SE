# US-F01-04 – Truy cập theo permission

## User Story

Là một **user đã đăng nhập**,  
tôi muốn **chỉ sử dụng các hành vi mà mình được cấp quyền**,  
để **dữ liệu và nghiệp vụ được bảo vệ đúng trách nhiệm**.

## Acceptance Criteria

- AC-US-F01-04-01: Given user có permission yêu cầu, when thực hiện hành vi, then hệ thống cho phép tiếp tục nếu các điều kiện nghiệp vụ khác hợp lệ.
- AC-US-F01-04-02: Given user thiếu permission, when thực hiện hành vi, then hệ thống từ chối và không thay đổi dữ liệu.
- AC-US-F01-04-03: Given Admin thiếu permission nghiệp vụ Manager, when thực hiện nghiệp vụ đó, then hệ thống vẫn từ chối.
- AC-US-F01-04-04: Given một user có nhiều role, then quyền thực tế là hợp của các permission được gán trực tiếp qua các role đó.

## Business Rules áp dụng

`BR-RBAC-01`, `BR-RBAC-02`, `BR-RBAC-03`.

## Functional Requirements liên quan

`FR-F01-05`.
