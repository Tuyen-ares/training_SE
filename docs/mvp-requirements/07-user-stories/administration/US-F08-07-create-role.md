# US-F08-07 – Tạo role

## User Story

Là một **Admin có `role.create`**, tôi muốn tạo custom role với tập permission ban đầu để biểu diễn trách nhiệm công việc mới.

## Acceptance Criteria

- Name là duy nhất, tối đa 30 ký tự.
- Role mới là custom và có ít nhất một existing permission.
- Permission selector hiển thị description; không tạo permission code mới.
- Ghi role và permission set trong một transaction.

## Business Rules áp dụng

`BR-RBAC-01..05`.

## Functional Requirements liên quan

`FR-F08-09`, `FR-F08-11`.
