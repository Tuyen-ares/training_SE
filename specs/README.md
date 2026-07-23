# Feature specifications

Mỗi folder dưới `specs/` đại diện cho một kết quả nghiệp vụ có thể triển khai và
kiểm thử độc lập:

```text
specs/<id>-<feature-name>/
├── spec.md   # WHAT: mục tiêu, phạm vi, requirement và acceptance criteria
├── plan.md   # HOW: module/API/data/transaction/security/test strategy
└── tasks.md  # Các bước thực thi nhỏ, có dependency và cách verify
```

Không tạo folder feature chỉ để mô tả một bảng hoặc một endpoint đơn lẻ.

## Workflow

1. Tạo `spec.md` từ `_template/spec.md` và chốt các điểm mơ hồ.
2. Review spec trước khi viết `plan.md`.
3. Viết plan bám theo architecture và module contract hiện hành.
4. Tách plan thành `tasks.md`; mỗi task tham chiếu requirement liên quan.
5. Kiểm tra spec/plan/tasks không mâu thuẫn rồi mới implement.

Repo hiện chưa cài workflow command tự động; các bước trên được thực hiện thủ công.
