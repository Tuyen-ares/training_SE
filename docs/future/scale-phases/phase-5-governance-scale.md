# Phase 5 — Governance & Scale Hardening

**Status: FUTURE / NOT IMPLEMENTED**
**Phụ thuộc: Phase 1–4 đã verified và có dữ liệu vận hành thực tế**

## Mục tiêu

Làm cho media foundation, image evidence và repair đủ an toàn, có thể audit,
kiểm soát chi phí và vận hành lâu dài khi volume tăng.

Phase 5 kế thừa contract Phase 1: private S3, public CloudFront + OAC, immutable
UUID key, `media_files`, typed business relations/FKs và manual DB-driven
cleanup/audit. Phase này harden/automate theo dữ liệu vận hành; không redesign
upload lifecycle nếu chưa có requirement mới.

## Phạm vi

### Audit và retention

- Immutable audit event cho các thay đổi nhạy cảm.
- Retention policy theo loại evidence/custody/repair.
- Quy trình archive, expire và cleanup có audit.
- Phân biệt delete metadata, revoke access và xóa object thật.

### Privacy và access

- Review lại actor/employee access theo dữ liệu thực tế.
- Quy tắc xem, chia sẻ, ẩn hoặc xóa evidence.
- Audit việc đọc/xóa evidence nếu policy yêu cầu.
- Nếu sau này cần evidence confidential/private, mở scope riêng để đổi storage
  access model sang CloudFront signed URL hoặc private access; không phủ nhận
  public CloudFront GET của roadmap hiện tại.

### Media operations

- Đánh giá kết quả các command manual `media:cleanup --dry-run`,
  `media:cleanup --execute` và `media:audit` của Phase 1 trước khi tự động hóa.
- Chỉ thêm scheduled cleanup/reconciliation worker khi volume, failure rate và
  vận hành thực tế chứng minh cần; chọn runtime/cron phù hợp thay vì mặc định
  Render Free hỗ trợ background job.
- Monitoring CloudFront public availability, cache behavior, 4xx/5xx, origin
  error và broken URL.
- Monitoring S3 object health, missing referenced object, metadata mismatch,
  stale `PENDING`, unlinked `READY`, detached replacement và cleanup failure.
- Cleanup/reconciliation phải dùng typed evidence relations và asset/user media
  FKs làm source of truth cho current reference. `linked_at IS NOT NULL` chỉ cho
  biết media từng được claim, không chứng minh media vẫn đang được dùng.
- Reconciliation giữa S3 object và metadata DB vẫn ưu tiên DB `storage_path`;
  chỉ thêm `ListBucket` nếu một use case đã review thực sự cần.
- Theo dõi S3 storage/request, CloudFront request/data transfer, budget alert và
  usage/cost anomaly; dọn orphan object an toàn.
- Cân nhắc video chỉ khi có use case, budget và retention policy rõ ràng.

### Receipt và reporting

- Receipt/PDF hoặc immutable snapshot cho handover/return/repair nếu business
  cần tài liệu đối chiếu.
- Báo cáo custody history, discrepancy và repair cost/warranty.
- Đảm bảo snapshot không thay đổi khi record hiện tại được mở rộng.

### Permission và role

- Permission normalization là migration riêng, không trộn vào Phase 1.
- Nếu tổ chức cần IT Support, tạo role preset bằng permission.
- Authorization vẫn dựa trên effective permission, không dựa trên tên role.

## Backend implementation slices

1. Chốt retention/privacy policy cùng business/legal owner.
2. Thêm audit event; chỉ thêm cleanup/reconciliation worker nếu policy, runtime
   và operational evidence đã được duyệt.
3. Thêm monitoring/alert cho metadata lifecycle, S3 object, CloudFront
   availability/errors/cache và AWS cost/usage.
4. Thêm snapshot/receipt/report API nếu có acceptance criteria.
5. Chạy permission normalization như migration độc lập, có compatibility/rollback
   plan.

## Frontend implementation slices

- Màn hình hoặc action xem audit history phù hợp với permission.
- Download/view receipt hoặc snapshot nếu được bật.
- Hiển thị retention/access state khi cần.
- Báo lỗi storage/receipt/report và retry rõ ràng.

## Test matrix

- Audit event không thể bị sửa qua API thông thường.
- Retention job không xóa nhầm object còn được tham chiếu.
- Orphan cleanup không xóa evidence hợp lệ.
- Scheduled cleanup, nếu được bật, phải phân biệt stale `PENDING`, never-linked
  `READY` và detached replacement; trước `DeleteObject` phải lock/recheck toàn bộ
  typed evidence relations và asset/user media FKs như manual cleanup Phase 1.
- User không có permission không được upload, link, delete hoặc thao tác qua
  BigIn API; public object GET vẫn không có BigIn authorization theo architecture
  hiện tại.
- Snapshot/receipt tái hiện đúng dữ liệu tại thời điểm giao dịch.
- Permission migration giữ đúng effective access trước và sau migration.
- Monitoring phát hiện CloudFront public availability, 4xx/5xx, origin error,
  cache bất thường, S3 object health, upload/storage/reconciliation failure,
  stale/orphan growth và cost/usage anomaly.

## Gate acceptance

Phase 5 đạt khi:

- Có owner và policy rõ cho retention, privacy, deletion và audit.
- Có reconciliation và cleanup an toàn, có thể quan sát.
- Có owner, threshold và runbook rõ trước khi thay manual cleanup bằng scheduled
  automation.
- Có báo cáo/receipt đúng scope đã duyệt.
- Permission normalization không làm mất quyền hợp lệ.
- Security, data-integrity, migration và operational tests đã verified.

## Không làm mặc định

- Không bật video chỉ vì hệ thống đã có image evidence.
- Không thêm role IT Support nếu chưa có nhu cầu vận hành.
- Không biến event log thành event sourcing toàn hệ thống.
- Không ép mọi evidence phải immutable nếu policy chưa yêu cầu.
- Không thêm `ListBucket`, worker/cron hoặc private delivery model chỉ vì hạ tầng
  AWS cho phép; mỗi thay đổi cần operational/business evidence.
