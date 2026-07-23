# Tài liệu dự án

## Cấu trúc

```text
docs/
├── architecture/          # Luật và quyết định ổn định toàn hệ thống
├── modules/               # Contract/requirements theo module nghiệp vụ
├── implementation-status/ # Snapshot code đã làm/chưa làm tại một thời điểm
└── *.md                    # Hướng dẫn kỹ thuật độc lập

specs/
├── README.md              # Quy ước feature specification
└── _template/             # Mẫu spec.md, plan.md và tasks.md
```

## Cách đọc trước khi làm feature

1. Đọc [`architecture/constitution.md`](architecture/constitution.md).
2. Đọc [`architecture/system-overview.md`](architecture/system-overview.md) và
   [`architecture/module-boundaries.md`](architecture/module-boundaries.md).
3. Đọc contract module liên quan trong [`modules/`](modules/).
4. Nếu feature đủ phức tạp, tạo folder mới dưới root [`specs/`](../specs/) từ template.

Khi triển khai một resource CRUD mới, dùng
[`crud-module-structure.md`](crud-module-structure.md) và Department làm implementation
tham chiếu.

Dữ liệu kiểm tra Postman cho các CRUD danh mục hiện tại nằm tại
[`postman-catalog-crud-test-data.md`](postman-catalog-crud-test-data.md).

Không tạo feature spec cho typo, đổi text nhỏ hoặc CRUD đã có pattern ổn định và
không thêm business rule.

## Nguồn sự thật

- Luật dự án: `docs/architecture/constitution.md`.
- Ownership module: `docs/architecture/module-boundaries.md`.
- Database thực tế: `apps/backend/prisma/schema.prisma`.
- Permission code: `docs/architecture/permission-registry.md`.
- Requirement module: `docs/modules/*.md`.
- Kế hoạch một feature: `specs/<id>-<feature>/`.

`implementation-status/` chỉ là snapshot hỗ trợ review; nếu mâu thuẫn với source
code hoặc architecture hiện hành thì source code/architecture được ưu tiên.
