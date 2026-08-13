# Future System Design

**Status: FUTURE / NOT IMPLEMENTED**

Các tài liệu trong thư mục này mô tả các hướng mở rộng sau MVP. Chúng không phải là
requirement hiện tại và không được dùng để tự động thay đổi code, database, schema,
API contract, permission hoặc giao diện.

MVP hiện tại là bộ F01–F08 trong [`../mvp-requirements/`](../mvp-requirements/).
Future design chỉ được kích hoạt sau khi MVP đã được review, chốt scope và verified.

## Thứ tự source of truth

Khi đọc hoặc triển khai hệ thống, ưu tiên theo thứ tự:

1. [`../mvp-requirements/`](../mvp-requirements/) — business source of truth hiện tại.
2. [`../contracts/`](../contracts/) — API/data contract đã chốt.
3. [`../delivery/`](../delivery/) — frontend specification và user flow.
4. Code, migration và integration test — running implementation truth.
5. [`../project-context/`](../project-context/) — technical memory hỗ trợ đọc project; không override các nguồn trên.
6. Tài liệu trong thư mục này — future design candidate; chưa phải requirement.

Nếu có xung đột:

```text
requirements/contracts hiện tại
> future docs
> implementation memory
```

## Quy trình kích hoạt future scope

```text
Future design
→ review/chốt scope
→ cập nhật requirement hiện tại hoặc tạo requirement version mới
→ cập nhật business rules
→ cập nhật API contract
→ cập nhật schema/design nếu cần
→ implementation plan
→ code
→ test
→ VERIFIED
```

Tuyệt đối không thực hiện quy trình:

```text
future doc → code trực tiếp
```

## Tài liệu

- [`scale-system.md`](scale-system.md) — hướng scale BigIn thành workflow ITAM đầy đủ hơn.
- [`open-questions.md`](open-questions.md) — các quyết định future chưa được chốt.
- [`scale-phases/`](scale-phases/README.md) — roadmap triển khai theo từng phase
  sau khi future scope được activation.

Các quyết định roadmap đã được review trong conversation được ghi ở
[`scale-phases/README.md`](scale-phases/README.md). Chúng vẫn là future planning
cho tới khi được chuyển thành requirement, contract và spec active; các câu hỏi
chưa được quyết định vẫn giữ trạng thái OPEN trong `open-questions.md`.
