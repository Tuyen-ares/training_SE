# F08 – Administration

## Mục tiêu

Quản lý vòng đời tài khoản và gán các role đã được định nghĩa sẵn.

## Actors

Admin có permission tương ứng.

## User Stories

- US-F08-01 – Xem danh sách user.
- US-F08-02 – Tạo user.
- US-F08-03 – Cập nhật user.
- US-F08-04 – Kích hoạt/vô hiệu hóa user.
- US-F08-05 – Gán/gỡ role có sẵn.

## Business Rules áp dụng

`BR-USR-01..03`, `BR-RBAC-01..04`, `BR-AUTH-01`.

## Functional Requirements liên quan

`FR-F08-01..07`.

## Dependencies

F01; departments; role và permission baseline.

## Out of Scope

CRUD role, CRUD permission code, role inheritance và public registration.
