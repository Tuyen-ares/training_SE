# US-F08-06 – Xem role

## User Story

Là một **Admin có `role.view`**, tôi muốn xem danh sách và chi tiết role để hiểu role đang dùng permission nào và được gán cho bao nhiêu user.

## Acceptance Criteria

- List trả name, system/custom, permission count và user count.
- Detail trả tập permission với code và English description.
- UI không hiển thị delete action.
- Authorization kiểm tra permission, không kiểm tra role name.

## Business Rules áp dụng

`BR-RBAC-01..07`.

## Functional Requirements liên quan

`FR-F08-08`, `FR-F08-11`.
