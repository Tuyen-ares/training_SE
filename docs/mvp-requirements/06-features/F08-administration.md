# F08 – Administration

## Mục tiêu

Quản lý vòng đời tài khoản, registration requests, role và tập permission của role.

## Actors

Admin có permission tương ứng.

## User Stories

- US-F08-01 – Xem danh sách user.
- US-F08-02 – Tạo user.
- US-F08-03 – Cập nhật user.
- US-F08-04 – Kích hoạt/vô hiệu hóa user.
- US-F08-05 – Gán/gỡ role có sẵn.
- US-F08-06 – Xem danh sách và chi tiết role.
- US-F08-07 – Tạo role.
- US-F08-08 – Cập nhật role và tập permission.

## Business Rules áp dụng

`BR-USR-01..03`, `BR-RBAC-01..07`, `BR-AUTH-01..08`.

## Functional Requirements liên quan

`FR-F08-01..12`.

## Dependencies

F01; departments; role và permission baseline.

## Out of Scope

Delete role, CRUD permission code và role inheritance.
