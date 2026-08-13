# Phase 3 — Repair Audit

**Status: FUTURE / NOT IMPLEMENTED**
**Phụ thuộc: Phase 0 đã đạt gate; có thể bắt đầu sau khi Phase 1 ổn định**

## Mục tiêu

Biến repair từ các field summary mutable trong `asset_issues` thành lịch sử sửa
chữa có cấu trúc, vẫn giữ `asset_issues` làm incident gốc và giữ nguyên state
machine MVP.

## Phạm vi lần đầu

### Repair record

Một issue có thể có một hoặc nhiều repair record theo từng lần xử lý. Record
phải có đủ timeline và actor cho:

- Intake/start/complete/fail.
- Repair provider.
- Cost.
- Warranty và thời hạn nếu có.
- Result và test result.
- Before/after image evidence.
- Note và timestamp.

### Parts

- Parts là các dòng có cấu trúc gắn với repair record.
- Có thể ghi tên, số lượng, mô tả và thông tin cần cho báo cáo theo design đã
  activation.
- Không tạo parts catalog/lifecycle riêng nếu chưa có requirement.

### Documents

- Phase đầu dùng image evidence cho invoice/biên bản nếu business cần lưu ảnh.
- Chưa tạo workflow upload tài liệu hoặc `repair_documents` riêng.
- Nếu cần file PDF/document gốc, mở decision riêng trước khi mở rộng phase.

## State transition phải giữ nguyên

```text
Report Issue  → REPORTED
Confirm Issue → CONFIRMED + asset DAMAGED
Start Repair  → IN_REPAIR
Complete      → COMPLETED + asset AVAILABLE
Fail          → FAILED + asset DAMAGED
```

> Repair fail không tự chuyển asset sang `RETIRED`. Repair complete không tự giao
> lại cho borrower cũ.

## Backend implementation slices

1. Thêm repair record liên kết với `asset_issue`.
2. Tách dữ liệu mới khỏi summary cũ nhưng giữ read compatibility cho MVP.
3. Thêm parts rows với transaction và idempotency phù hợp.
4. Gắn shared evidence Phase 1 cho intake/result/before/after.
5. Mở API cho timeline, parts, cost, warranty, result và test result.
6. Bảo đảm complete/fail atomic với asset transition.

## Frontend implementation slices

- Repair timeline theo issue.
- Form nhập provider, cost, warranty, parts và test result.
- Upload/preview image before/after.
- Hiển thị actor, timestamp và trạng thái từng repair attempt.
- Error, retry, mutation loading và permission state.

## Test matrix

- Một issue có nhiều repair attempt được hiển thị đúng thứ tự.
- Parts không bị mất khi cập nhật repair record.
- Complete/fail giữ nguyên asset state và issue status hiện hành.
- Concurrent complete không tạo kết quả hoàn tất thứ hai.
- Evidence repair chịu cùng access control và cleanup rule của Phase 1.
- Read API cũ không bị phá bởi repair record mới.
- Cost, warranty và test result validate đúng boundary.

## Gate acceptance

Phase 3 đạt khi:

- Có timeline audit đủ để biết ai xử lý, lúc nào, với kết quả nào.
- Parts và commercial fields có thể query/report mà không parse text tự do.
- State transition MVP vẫn đúng trong normal, fail và retry cases.
- Có evidence trước/sau theo quyền.
- Không tạo workflow provider approval hoặc document management ngoài scope.

## Không làm trong phase này

- Không làm repair handback tự động.
- Không thêm `WAITING_HANDBACK`.
- Không làm invoice/document repository riêng.
- Không thêm role IT Support.
