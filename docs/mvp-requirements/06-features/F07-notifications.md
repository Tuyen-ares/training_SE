# F07 – Notifications

## Mục tiêu

Giúp user theo dõi các thay đổi nghiệp vụ liên quan ngay trong hệ thống.

## Actors

User nhận notification.

## User Stories

- US-F07-01 – Xem notification.
- US-F07-02 – Đánh dấu đã đọc.
- US-F07-03 – Mở đối tượng liên quan.
- US-F07-04 – Cho phép browser nhận thông báo realtime qua FCM Web Push.

## Business Rules áp dụng

`BR-NOT-01..03`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F07-01..05`.

## Dependencies

F01 và các feature phát sinh event; recipient được xác định theo user/permission và entity liên quan.

## Browser Push

FCM Web Push thuộc active F07 scope. User phải chủ động cấp quyền trên browser;
FCM token được gắn với user/device trong backend. Bản ghi notifications vẫn là
nguồn sự thật để hiển thị badge và danh sách in-app; FCM chỉ là tín hiệu realtime
để frontend refresh dữ liệu, không thay thế API F07.

## Out of Scope

SMS, mobile push và notification scheduling. SMTP email và browser FCM Web Push
được gửi bất đồng bộ sau khi nghiệp vụ chính commit.
