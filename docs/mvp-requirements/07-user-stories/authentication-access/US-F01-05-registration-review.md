# US-F01-05 – Đăng ký và xét duyệt tài khoản

## User Story

Là một **Guest**,  
tôi muốn **gửi yêu cầu đăng ký bằng thông tin cá nhân cơ bản**,  
để **người có thẩm quyền xét duyệt trước khi tôi truy cập hệ thống**.

Là một **Admin hoặc Asset Manager**,  
tôi muốn **duyệt hoặc từ chối yêu cầu đăng ký**,  
để **chỉ những người phù hợp mới được cấp tài khoản**.

## Acceptance Criteria

- AC-US-F01-05-01: Given thông tin hợp lệ, when người dùng gửi form đăng ký, then hệ thống tạo yêu cầu `PENDING`, không tạo phiên và hiển thị rằng yêu cầu đang chờ duyệt.
- AC-US-F01-05-02: Form đăng ký không cho người dùng tự chọn role hoặc department.
- AC-US-F01-05-03: Given reviewer có `user_registration.review`, when duyệt một yêu cầu, then reviewer có thể chọn department hoặc để trống và có thể chọn role có sẵn; nếu không chọn role, hệ thống gán `employee`.
- AC-US-F01-05-04: Given reviewer từ chối, when hoàn tất thao tác, then yêu cầu không tạo tài khoản active và lưu được kết quả từ chối.
- AC-US-F01-05-05: User không có permission review không được xem hoặc xử lý yêu cầu đăng ký của người khác.

## Business Rules áp dụng

`BR-AUTH-05`, `BR-AUTH-06`, `BR-RBAC-01..03`, `BR-USR-01..02`.

## Functional Requirements liên quan

`FR-F01-06`, `FR-F01-07`.
