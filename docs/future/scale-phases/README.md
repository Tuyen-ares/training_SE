# Future Scale — Implementation Phases

**Status: FUTURE / NOT IMPLEMENTED**

Thư mục này tách roadmap scale thành từng phase độc lập để có thể review và
triển khai dần. Các file ở đây không phải là requirement hiện tại và không được
dùng để tự động thay đổi code, database, API, permission hoặc giao diện MVP.

## Cách sử dụng

1. Bắt đầu từ `phase-0-activation.md` để biến quyết định future thành requirement
   chính thức.
2. Chỉ triển khai một phase sau khi phase trước đã đạt gate và tài liệu active đã
   được cập nhật.
3. Mỗi phase phải có contract, migration, backend, frontend, test và verification
   report riêng.
4. Sau khi verified, ghi lại trạng thái phase trong tài liệu delivery/project
   context phù hợp; không coi việc đánh dấu trong folder này là bằng chứng đã
   triển khai.

## Các quyết định roadmap đã review

| Chủ đề | Quyết định hiện tại |
|---|---|
| Kiến trúc | Tách entity nghiệp vụ riêng, nhưng schema phải lean và tách theo nhu cầu thực tế. |
| Evidence | Optional; Phase 1 chỉ hỗ trợ image. |
| Storage | Object storage qua adapter; provider và URL strategy chốt trong design Phase 1. |
| Quyền xem | Dùng permission hiện có kết hợp quan hệ nghiệp vụ; chưa thêm `evidence.view`. |
| Acknowledgement | Nút xác nhận của authenticated user; không bắt buộc để đóng lifecycle. |
| Accessories | Checklist trước, chưa quản lý accessory như asset độc lập. |
| Discrepancy | Thiếu/hỏng phụ kiện không chặn return; lưu discrepancy để xử lý tiếp. |
| Repair handback | Repair Complete → `AVAILABLE`; employee tự tạo request mới. |
| Repair audit | Repair record + parts rows; image evidence cho tài liệu trước mắt. |
| IT Support | Chưa thêm role; tiếp tục cấp capability bằng permission. |
| Governance | Baseline bảo mật/audit ở Phase 1; retention, privacy sâu và immutable log ở Phase 5. |
| Receipt/PDF | Để Phase 5. |

## Thứ tự và phụ thuộc

```text
Phase 0 — Activation
        ↓
Phase 1 — Evidence & Custody
        ↓
Phase 2 — Accessories       Phase 3 — Repair Audit
        \\                         /
         \\                       /
          └──── Phase 4 — Repair Handback policy
                              ↓
                   Phase 5 — Governance & Scale
```

Phase 2 và Phase 3 có thể chuẩn bị song song sau Phase 1, nhưng mỗi phase vẫn
phải có scope và verification riêng. Phase 4 theo quyết định hiện tại là một
policy tối giản, không thêm workflow `WAITING_HANDBACK`.

## Danh sách phase

- [Phase 0 — Activation và chốt thiết kế](phase-0-activation.md)
- [Phase 1 — Evidence & Custody Core](phase-1-evidence-custody.md)
- [Phase 2 — Accessories Checklist](phase-2-accessories-checklist.md)
- [Phase 3 — Repair Audit](phase-3-repair-audit.md)
- [Phase 4 — Repair Handback theo Option A](phase-4-repair-handback.md)
- [Phase 5 — Governance & Scale Hardening](phase-5-governance-scale.md)

## Quy tắc không thay đổi

- Không implement trực tiếp từ `docs/future/**`.
- Approval không đồng nghĩa với handover.
- Authorization kiểm tra effective permission, không hard-code tên role.
- Không lưu binary trong MariaDB.
- Không backfill evidence giả cho history MVP cũ.
- Không thêm status mới nếu chưa có requirement và business rule riêng.

