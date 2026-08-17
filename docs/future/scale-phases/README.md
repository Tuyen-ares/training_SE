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
| Kiến trúc | Phase 1 là media foundation chung: `media_files` quản lý object/lifecycle; ba typed evidence tables giữ business FK; asset/user dùng nullable media FK và legacy URL fallback. |
| Evidence | Optional; Phase 1 hỗ trợ image cho handover, return và successful Complete Repair. |
| Storage | Binary ở private AWS S3; CloudFront + OAC là public read layer; MariaDB giữ metadata và typed relations; đọc bằng public/stable CloudFront URL. |
| Upload lifecycle | Presign tạo media `PENDING`; frontend PUT S3; complete dùng `HeadObject` chuyển `READY`; business transaction claim bằng `linked_at` rồi tạo relation/FK. |
| Asset/user | Mỗi asset có tối đa một ảnh và mỗi user một avatar; upload mới dùng media FK, `image_url`/`avatar_url` tiếp tục làm legacy fallback. |
| Quyền xem | Dùng permission hiện có kết hợp quan hệ nghiệp vụ; chưa thêm `evidence.view`. |
| Accessories | Phase 2 dùng checklist, chưa quản lý accessory như asset độc lập; checklist và evidence cùng gắn với `borrow_histories`, không FK trực tiếp và không tự thêm purpose mới. |
| Discrepancy | Thiếu/hỏng phụ kiện không chặn return; lưu discrepancy để xử lý tiếp. |
| Repair audit | Phase 1 chỉ có `AFTER_REPAIR` cho Complete Repair thành công và relation ban đầu vào `asset_issues`; Phase 3 sở hữu mọi quyết định về before-repair/invoice media hoặc chuyển sang `repair_records`. |
| Repair handback | Repair Complete → `AVAILABLE`, employee tạo request mới; Phase 4 không tạo/relink/copy media hoặc biến repair evidence thành handover evidence. |
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

### Ownership giữa các phase

- Phase 0 chuyển architecture đã review sang requirement/contract active và xác
  nhận activation gate.
- Phase 1 là technical source of truth cho S3/CloudFront, media lifecycle,
  purpose, API upload, typed evidence, asset/avatar compatibility và manual
  cleanup.
- Phase 2 chỉ consume `HANDOVER`/`RETURN` evidence bên cạnh accessory
  checklist.
- Phase 3 sở hữu structured repair audit và mọi media purpose mới ngoài
  `AFTER_REPAIR`.
- Phase 4 chỉ giữ repair handback policy, không sở hữu media upload.
- Phase 5 sở hữu retention, privacy, monitoring, cost và quyết định tự động hóa
  cleanup/reconciliation khi có dữ liệu vận hành.

## Danh sách phase

- [AWS S3 + CloudFront — Environment Setup](aws-s3-cloudfront-environment-setup.md)
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
- Binary nằm ở private AWS S3 và đọc bằng public/stable CloudFront URL qua OAC;
  public URL không có BigIn authorization, còn upload/delete vẫn qua
  API/backend được xác thực.
- S3 giữ Bucket owner enforced, Block Public Access và không dùng public ACL;
  backend dùng IAM để upload/delete/verify, còn frontend chỉ nhận presigned PUT.
- Ưu tiên lưu `storage_path` và derive URL từ
  `PUBLIC_MEDIA_BASE_URL + "/" + storage_path`;
  không lưu signed URL.
- `storage_path` dùng UUID hoặc random filename, không chứa employee name, asset
  serial, issue description, email hay business-sensitive text. UUID chỉ giảm khả
  năng đoán URL, không phải privacy/security boundary.
- `media_files` chứa object metadata và upload lifecycle
  `PENDING`/`READY`; `media_files.id` là `mediaId`, không có upload session
  ID riêng.
- Không dùng polymorphic target/owner, nullable business target FK hoặc parse
  path để authorize. Business ownership nằm ở typed evidence relation hoặc
  asset/user media FK.
- Presign không nhận generic `targetId`/`targetType`; target/state được
  validate khi business mutation claim media.
- `purpose` ngăn cross-purpose reuse; `linked_at` được claim atomically cùng
  business mutation và relation/FK trong một DB transaction.
- `linked_at` chỉ chứng minh media đã từng được claim. Typed evidence relations
  và asset/user media FKs mới là source of truth cho media hiện còn được tham
  chiếu.
- Không backfill evidence giả cho history MVP cũ.
- Không reuse cùng media giữa handover, return và repair.
- Phase 2 không tạo FK checklist → evidence. Phase 4 không move/copy repair
  evidence sang borrow request/history mới.
- Phase 1 không phụ thuộc `repair_records`; Phase 3 chỉ review migration khi
  structured repair attempts thực sự cần.
- Phase 1 cleanup là manual và DB-driven, phân biệt stale `PENDING`, never-linked
  `READY` và detached replacement; worker/cron chỉ thuộc Phase 5 nếu dữ liệu vận
  hành chứng minh cần.
- Không thêm status mới nếu chưa có requirement và business rule riêng.
