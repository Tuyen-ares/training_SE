# Bộ yêu cầu MVP – Hệ thống quản lý tài sản IT

Bộ tài liệu này là nguồn yêu cầu nghiệp vụ cho MVP. Thứ tự đọc khuyến nghị:

1. [Bối cảnh](00-context.md) và [phạm vi](01-mvp-scope.md).
2. [Actors](02-actors.md), [Business Requirements](03-business-requirements.md), [Business Rules](04-business-rules.md) và [Functional Requirements](05-functional-requirements.md).
3. Các [Feature](06-features/) và [User Story](07-user-stories/).
4. [Traceability Matrix](08-traceability-matrix.md) và [Open Questions](09-open-questions.md).

## Nguyên tắc

- `database.md` và Prisma schema là baseline kỹ thuật chỉ đọc tại thời điểm lập tài liệu.
- Tài liệu này mô tả **WHAT/WHY**, không quy định route, SQL, Prisma, service hay giao diện cụ thể.
- Quyết định chưa được chốt nằm trong `09-open-questions.md`; không được suy diễn thành yêu cầu.
- Trình tự dự án: requirement → chốt spec → backend/frontend → test theo AC/BR.

## Quy ước ID

| Loại | Mẫu |
|---|---|
| Business Requirement | `BREQ-01` |
| Business Rule | `BR-BOR-01` |
| Functional Requirement | `FR-F03-01` |
| Feature | `F03` |
| User Story | `US-F03-01` |
| Acceptance Criteria | `AC-US-F03-01-01` |

