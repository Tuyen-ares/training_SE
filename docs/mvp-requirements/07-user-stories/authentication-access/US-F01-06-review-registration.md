# US-F01-06 – Xét duyệt yêu cầu đăng ký

## User Story

Là một **user có `user_registration.review`**, tôi muốn xem, duyệt hoặc từ chối registration request để chỉ applicant hợp lệ được tạo tài khoản.

## Acceptance Criteria

- Queue hỗ trợ status, search và pagination; pending cũ nhất hiển thị trước.
- Approval bắt buộc department, cho phép nhiều existing role và dùng `employee` nếu bỏ qua roleIds.
- Approval tạo user + userCode + roles, link createdUserId và clear hash trong một transaction.
- Reject clear hash; rejectionReason optional; không tạo user.
- Request đã review không thể xử lý lần hai.
- User thiếu `user_registration.review` không thể xem hoặc xử lý request.

## Business Rules áp dụng

`BR-AUTH-05..08`, `BR-RBAC-01..03`, `BR-USR-01..02`.

## Functional Requirements liên quan

`FR-F01-07..09`.
