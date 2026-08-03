# US-F08-05 – Gán hoặc gỡ role có sẵn

## User Story

Là một **Admin có quyền phân vai trò**,  
tôi muốn **gán hoặc gỡ các role đã có cho user**,  
để **quyền truy cập phản ánh đúng trách nhiệm công việc**.

## Acceptance Criteria

- AC-US-F08-05-01: Given có permission, when mở phân vai trò, then hệ thống hiển thị các role có sẵn.
- AC-US-F08-05-02: Given user và role hợp lệ, when lưu, then tập role của user phản ánh lựa chọn.
- AC-US-F08-05-03: Given role không tồn tại, then hệ thống từ chối và không lưu tập role dở dang.
- AC-US-F08-05-04: Gán lại cùng role không tạo quan hệ trùng.
- AC-US-F08-05-05: Thay đổi role không tạo role hoặc permission code mới.
- AC-US-F08-05-06: Admin không tự nhận quyền nghiệp vụ ngoài permission của các role được gán.

## Business Rules áp dụng

`BR-RBAC-01`, `BR-RBAC-02`, `BR-RBAC-03`, `BR-RBAC-04`.

## Functional Requirements liên quan

`FR-F08-05`, `FR-F08-06`, `FR-F08-07`.
