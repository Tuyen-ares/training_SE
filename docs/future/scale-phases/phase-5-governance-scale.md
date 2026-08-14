# Phase 5 — Governance & Scale Hardening

**Status: FUTURE / NOT IMPLEMENTED**
**Phụ thuộc: Phase 1–4 đã verified và có dữ liệu vận hành thực tế**

## Mục tiêu

Làm cho image evidence và repair đủ an toàn, có thể audit, kiểm soát chi phí và
vận hành lâu dài khi volume tăng.

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
  access model; không phủ nhận public URL của roadmap hiện tại.

### Media operations

- Orphan object cleanup định kỳ.
- Retry/reconciliation giữa object storage và metadata DB.
- Monitoring public media availability, broken URL detection, object health,
  storage usage, latency và storage reconciliation.
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
2. Thêm audit event và cleanup worker theo policy đã duyệt.
3. Thêm reconciliation/monitoring cho metadata và object storage.
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
- User không có permission không được upload, link, delete hoặc thao tác qua
  BigIn API; public object GET vẫn không có BigIn authorization theo architecture
  hiện tại.
- Snapshot/receipt tái hiện đúng dữ liệu tại thời điểm giao dịch.
- Permission migration giữ đúng effective access trước và sau migration.
- Monitoring phát hiện public media availability, broken URL, object health,
  upload/storage/reconciliation failure.

## Gate acceptance

Phase 5 đạt khi:

- Có owner và policy rõ cho retention, privacy, deletion và audit.
- Có reconciliation và cleanup an toàn, có thể quan sát.
- Có báo cáo/receipt đúng scope đã duyệt.
- Permission normalization không làm mất quyền hợp lệ.
- Security, data-integrity, migration và operational tests đã verified.

## Không làm mặc định

- Không bật video chỉ vì hệ thống đã có image evidence.
- Không thêm role IT Support nếu chưa có nhu cầu vận hành.
- Không biến event log thành event sourcing toàn hệ thống.
- Không ép mọi evidence phải immutable nếu policy chưa yêu cầu.
