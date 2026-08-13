# US-F08-08 – Cập nhật role và permission set

## User Story

Là một **Admin có `role.update`**, tôi muốn đổi tên custom role và tick/untick permission để cập nhật quyền theo trách nhiệm hiện tại.

## Acceptance Criteria

- Custom role được rename; system role name bị bảo vệ.
- Save permissions thay toàn bộ set và set mới không được rỗng.
- Mutation rollback nếu làm mất essential admin invariant.
- User đang mang role nhận effective permission mới ở lần login/refresh tiếp theo.
- Không hỗ trợ delete role hoặc permission CRUD.

## Business Rules áp dụng

`BR-RBAC-01..07`.

## Functional Requirements liên quan

`FR-F08-10..12`.
