# F07 – Notifications

## Mục tiêu

Giúp user theo dõi các thay đổi nghiệp vụ liên quan ngay trong hệ thống.

## Actors

User nhận notification.

## User Stories

- US-F07-01 – Xem notification.
- US-F07-02 – Đánh dấu đã đọc.
- US-F07-03 – Mở đối tượng liên quan.

## Business Rules áp dụng

`BR-NOT-01..03`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F07-01..05`.

## Dependencies

F01 và các feature phát sinh event; recipient được xác định theo user/permission và entity liên quan.

## Out of Scope

Email, SMS, mobile push và notification scheduling.
