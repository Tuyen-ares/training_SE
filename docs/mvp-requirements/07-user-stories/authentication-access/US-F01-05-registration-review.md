# US-F01-05 – Gửi yêu cầu đăng ký tài khoản

## User Story

Là một **Guest**,  
tôi muốn **gửi yêu cầu đăng ký bằng thông tin cá nhân cơ bản**,  
để **người có thẩm quyền xét duyệt trước khi tôi truy cập hệ thống**.

## Acceptance Criteria

- AC-US-F01-05-01: Given thông tin hợp lệ, when người dùng gửi form đăng ký, then hệ thống tạo yêu cầu `PENDING`, không tạo phiên và hiển thị rằng yêu cầu đang chờ duyệt.
- AC-US-F01-05-02: Form đăng ký không cho người dùng tự chọn role hoặc department.
- AC-US-F01-05-03: Một email hoặc số điện thoại chỉ có tối đa một request `PENDING`, kể cả khi nhiều request gửi concurrent.
- AC-US-F01-05-04: Request bị reject đã clear pending key nên applicant có thể đăng ký lại.

## Business Rules áp dụng

`BR-AUTH-05`, `BR-AUTH-07`, `BR-USR-01..02`.

## Functional Requirements liên quan

`FR-F01-06`.
