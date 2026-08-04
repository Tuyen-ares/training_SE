# US-F06-02 – Xem danh sách và chi tiết issue

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **xem các báo cáo và thông tin xử lý**,  
để **ưu tiên và theo dõi công việc sửa chữa**.

## Acceptance Criteria

- AC-US-F06-02-01: Given có permission, when mở danh sách, then hệ thống hiển thị issue thuộc phạm vi được phép.
- AC-US-F06-02-02: Then mỗi issue thể hiện asset, người báo, mô tả và status hiện tại khi có dữ liệu.
- AC-US-F06-02-03: When mở chi tiết, then hệ thống hiển thị thông tin xử lý/sửa chữa đã ghi.
- AC-US-F06-02-04: Given thiếu permission, then hệ thống không cung cấp dữ liệu issue.

## Business Rules áp dụng

`BR-ISS-03`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F06-02`.
