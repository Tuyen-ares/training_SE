# Tài liệu dự án

## Cấu trúc

```text
docs/
├── architecture/          # Luật và quyết định ổn định toàn hệ thống
├── modules/               # spec/plan/tasks/implementation theo module
├── implementation-status/ # Snapshot cũ trong thời gian chuyển đổi
└── *.md                    # Hướng dẫn kỹ thuật độc lập
```

## Cách đọc trước khi làm feature

1. Đọc [`architecture/constitution.md`](architecture/constitution.md).
2. Đọc [`architecture/system-overview.md`](architecture/system-overview.md) và
   [`architecture/module-boundaries.md`](architecture/module-boundaries.md).
3. Đọc `spec.md` của module liên quan trong [`modules/`](modules/).
4. Review `plan.md`, sau đó thực hiện theo `tasks.md`.
5. Sau khi code/verify, cập nhật `implementation.md`.

Khi triển khai một resource CRUD mới, dùng
[`crud-module-structure.md`](crud-module-structure.md) và Department làm implementation
tham chiếu.

Dữ liệu kiểm tra Postman cho các CRUD danh mục hiện tại nằm tại
[`postman-catalog-crud-test-data.md`](postman-catalog-crud-test-data.md).

Không tạo module mới cho typo, đổi text nhỏ, một trang UI hoặc CRUD lookup không có
ownership riêng. Dashboard là feature trình bày xuyên module, không phải domain module.

## Nguồn sự thật

- Luật dự án: `docs/architecture/constitution.md`.
- Ownership module: `docs/architecture/module-boundaries.md`.
- Database thực tế: `apps/backend/prisma/schema.prisma`.
- Permission code: `docs/architecture/permission-registry.md`.
- Requirement module: `docs/modules/<module>/spec.md`.
- Kế hoạch module: `docs/modules/<module>/plan.md`.
- Checklist thực thi: `docs/modules/<module>/tasks.md`.
- Trạng thái AS-BUILT: `docs/modules/<module>/implementation.md`.

`implementation-status/` là snapshot cũ để tham khảo trong thời gian chuyển đổi.
Thông tin mới phải cập nhật vào `modules/<module>/implementation.md`. Nếu tài liệu
AS-BUILT mâu thuẫn source code, source code là bằng chứng trạng thái thực tế; nếu
source code mâu thuẫn spec thì phải review thay vì âm thầm sửa spec theo code.
