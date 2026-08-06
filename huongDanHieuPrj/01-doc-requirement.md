# 01. Đọc requirement như thế nào?

## Đọc theo thứ tự

1. [Context](../docs/mvp-requirements/00-context.md): project giải quyết vấn đề gì?
2. [Scope](../docs/mvp-requirements/01-mvp-scope.md): làm gì và không làm gì?
3. [Actors](../docs/mvp-requirements/02-actors.md): ai dùng hệ thống?
4. [Business Requirements](../docs/mvp-requirements/03-business-requirements.md): nhu cầu cấp cao.
5. [Business Rules](../docs/mvp-requirements/04-business-rules.md): các điều kiện bắt buộc.
6. [Functional Requirements](../docs/mvp-requirements/05-functional-requirements.md): hệ thống phải cung cấp hành vi nào.
7. [Feature](../docs/mvp-requirements/06-features/): nhóm nghiệp vụ.
8. [User Story](../docs/mvp-requirements/07-user-stories/): một mục tiêu nhỏ của người dùng.

## Feature, User Story và Business Rule khác nhau

Ví dụ:

```text
Feature: F03 Borrow Request
User Story: Nhân viên tạo phiếu mượn
Business Rule: Asset phải AVAILABLE khi tạo yêu cầu
Functional Requirement: Hệ thống phải cho phép tạo phiếu có nhiều asset
```

- Feature là khu vực lớn.
- User Story là mục tiêu người dùng.
- Business Rule là điều kiện luôn phải đúng.
- Functional Requirement là hành vi hệ thống cần cung cấp.

## Khi đọc một User Story, hãy gạch ra

```text
Actor       = ai làm?
Action      = làm gì?
Input       = cần dữ liệu gì?
Permission  = cần quyền gì?
Precondition= điều kiện trước khi làm?
State       = trạng thái thay đổi thế nào?
Output      = trả về hoặc hiển thị gì?
Exception   = trường hợp nào bị từ chối?
```

Ví dụ, [US-F04-02 – Duyệt detail](../docs/mvp-requirements/07-user-stories/approval-reservation/US-F04-02-approve-detail.md) cần đọc kỹ điều kiện asset và thay đổi `APPROVED`/`RESERVED` trước khi mở code.

## Đừng lấy tài liệu cũ làm nguồn chính

Tài liệu cũ có thể nói reserve asset khi tạo request hoặc duyệt ở header. Nếu mâu thuẫn với requirement mới, ghi nhận discrepancy và dùng requirement mới làm nguồn chính. [Traceability matrix](../docs/mvp-requirements/08-traceability-matrix.md) giúp kiểm tra sự liên kết.

