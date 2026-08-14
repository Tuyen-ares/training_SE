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
| Kiến trúc | Phase 1 chốt bốn conceptual entity: `media_files`, `handover_evidence`, `return_evidence`, `repair_evidence`; schema vẫn phải lean. |
| Evidence | Optional; Phase 1 chỉ hỗ trợ image cho handover, return và post-repair. |
| Storage | Binary ở public object storage; MariaDB giữ metadata và typed relations; đọc bằng public/stable URL. Provider và chi tiết kỹ thuật chốt trong Phase 1. |
| Quyền xem | Dùng permission hiện có kết hợp quan hệ nghiệp vụ; chưa thêm `evidence.view`. |
| Accessories | Checklist trước, chưa quản lý accessory như asset độc lập. |
| Discrepancy | Thiếu/hỏng phụ kiện không chặn return; lưu discrepancy để xử lý tiếp. |
| Repair handback | Repair Complete → `AVAILABLE`; employee tự tạo request mới. |
| Repair audit | Phase 3 mới làm `repair_records`, parts, warranty, cost và timeline; Phase 1 chỉ có `repair_evidence` gắn ban đầu với `asset_issues`. |
| IT Support | Chưa thêm role; tiếp tục cấp capability bằng permission. |
| Governance | Baseline bảo mật/audit ở Phase 1; retention, privacy sâu và immutable log ở Phase 5. |
| Receipt/PDF | Để Phase 5. |

## Thứ tự và phụ thuộc

```text
Phase 0 — Activation
        ↓
Phase 1 — Image Evidence Core
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
- [Phase 1 — Image Evidence Core](phase-1-image-evidence-core.md)
- [Phase 2 — Accessories Checklist](phase-2-accessories-checklist.md)
- [Phase 3 — Repair Audit](phase-3-repair-audit.md)
- [Phase 4 — Repair Handback theo Option A](phase-4-repair-handback.md)
- [Phase 5 — Governance & Scale Hardening](phase-5-governance-scale.md)

## Quy tắc không thay đổi

- Không implement trực tiếp từ `docs/future/**`.
- Approval không đồng nghĩa với handover.
- Authorization kiểm tra effective permission, không hard-code tên role.
- Không lưu binary trong MariaDB.
- Binary nằm ở public object storage và đọc bằng public/stable URL; public URL
  không có BigIn authorization, còn upload/delete vẫn qua API/backend được xác thực.
- Ưu tiên lưu `storage_path` và derive URL từ `PUBLIC_MEDIA_BASE_URL + storage_path`;
  không lưu signed URL.
- `storage_path` dùng UUID hoặc random filename, không chứa employee name, asset
  serial, issue description, email hay business-sensitive text. UUID chỉ giảm khả
  năng đoán URL, không phải privacy/security boundary.
- `media_files` chỉ chứa generic metadata; không dùng `owner_type`/`owner_id`,
  nullable business FK hoặc parse path để authorize ownership.
- Không backfill evidence giả cho history MVP cũ.
- Không reuse cùng media giữa handover, return và repair.
- Phase 1 không phụ thuộc `repair_records`; Phase 3 chỉ review migration khi
  structured repair attempts thực sự cần.
- Không thêm status mới nếu chưa có requirement và business rule riêng.
