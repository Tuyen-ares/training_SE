# Frontend Specification – MVP

Tài liệu này mô tả **cách người dùng đi qua giao diện** để thực hiện các User Story MVP. Phạm vi chỉ gồm user flow, navigation và screen inventory; đây không phải API contract, tài liệu thiết kế chi tiết hay hướng dẫn code Vue.

## Thứ tự đọc

1. [Frontend context](00-frontend-context.md).
2. [Navigation](01-navigation.md) và [Screen Inventory](02-screen-inventory.md).
3. Các tài liệu trong [User Flows](03-user-flows/).
4. [Stitch review](04-stitch-review.md) và [Frontend Open Questions](05-frontend-open-questions.md).

## Nguồn sự thật

1. User Story, Acceptance Criteria và Business Rule trong [`../mvp-requirements/`](../mvp-requirements/README.md).
2. Bộ Frontend Specification này.
3. [`../../design/DESIGN_SYSTEM.md`](../../design/DESIGN_SYSTEM.md) và [`../../design/DESIGN.md`](../../design/DESIGN.md).
4. Stitch mockup.
5. Frontend hiện có.

Khi có mâu thuẫn, không sửa requirement để khớp mockup hoặc code cũ. Ghi nhận tại `04-stitch-review.md` hoặc `05-frontend-open-questions.md`.

## Ranh giới giai đoạn 1

- Có 18 screen/reusable screen template và 22 user flow chính.
- Dialog/drawer là workflow state của screen cha, không phải screen mới.
- Không quy định route URL, request/response, component props, SQL, Prisma hoặc service.
- Không thay đổi màu sắc, design language hoặc Stitch trong giai đoạn này.
