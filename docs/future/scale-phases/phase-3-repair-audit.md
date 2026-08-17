# Phase 3 — Repair Audit

**Status: FUTURE / NOT IMPLEMENTED**
**Phụ thuộc: Phase 0 đã đạt gate; có thể bắt đầu sau khi Phase 1 ổn định**

## Mục tiêu

Biến repair từ các field summary mutable trong `asset_issues` thành lịch sử sửa
chữa có cấu trúc, vẫn giữ `asset_issues` làm incident gốc và giữ nguyên state
machine MVP.

## Boundary với Image Evidence Core

Phase 1 khởi đầu với relation:

```text
asset_issues → repair_evidence → media_files
```

Phase 3 chịu trách nhiệm structured `repair_records`, parts, warranty, cost,
provider, timeline, repair result và test result. Khi `repair_records` được
activate, Phase 3 bắt buộc mở migration/ownership review để quyết định có chuyển
repair evidence sang:

```text
repair_records → repair_evidence → media_files
```

Chỉ migrate nếu structured Repair Audit thực sự cần phân biệt nhiều repair
attempt. Review này không phải dependency của Phase 1 và không được làm Phase 1
phụ thuộc `repair_records`.

Phase 1 chỉ cung cấp purpose `AFTER_REPAIR` cho image được link khi Complete
Repair thành công. `AFTER_REPAIR` không được dùng cho ảnh trước sửa, repair
failed, invoice hoặc biên bản.

Nếu Phase 3 cần các loại media đó, activation của Phase 3 phải chốt purpose,
prefix, permission, max count/size, link timing và parent relation riêng trước
implementation. Phase 3 được reuse upload lifecycle, S3/CloudFront adapter,
security và cleanup contract của Phase 1; không tạo media foundation thứ hai.

## Phạm vi lần đầu

### Repair record

Một issue có thể có một hoặc nhiều repair record theo từng lần xử lý. Record
phải có đủ timeline và actor cho:

- Intake/start/complete/fail.
- Repair provider.
- Cost.
- Warranty và thời hạn nếu có.
- Result và test result.
- After-repair image kế thừa `AFTER_REPAIR` từ Phase 1.
- Before-repair image chỉ thuộc scope khi Phase 3 activation một purpose/policy
  riêng; không mặc định dùng `AFTER_REPAIR`.
- Note và timestamp.

### Parts

- Parts là các dòng có cấu trúc gắn với repair record.
- Có thể ghi tên, số lượng, mô tả và thông tin cần cho báo cáo theo design đã
  activation.
- Không tạo parts catalog/lifecycle riêng nếu chưa có requirement.

### Documents

- Image của invoice/biên bản chỉ được thêm khi Phase 3 activation purpose/policy
  riêng; không tái sử dụng `AFTER_REPAIR` hoặc lưu dưới generic repair evidence
  chỉ để tránh thiết kế contract.
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
4. Review ownership của `repair_evidence → media_files` với relation ban đầu là
   `asset_issues → repair_evidence`; chỉ migrate sang `repair_records` nếu cần
   nhiều repair attempt.
5. Nếu activation before-repair/invoice media, thêm purpose policy và typed
   relation phù hợp bằng design review riêng; không đổi contract Phase 1 ngầm.
6. Mở API cho timeline, parts, cost, warranty, result và test result.
7. Bảo đảm complete/fail atomic với asset transition.

## Frontend implementation slices

- Repair timeline theo issue.
- Form nhập provider, cost, warranty, parts và test result.
- Upload/preview `AFTER_REPAIR` image khi Complete Repair thành công.
- Chỉ hiển thị/upload before-repair hoặc invoice image nếu scope/purpose tương
  ứng đã được activation.
- Hiển thị actor, timestamp và trạng thái từng repair attempt.
- Error, retry, mutation loading và permission state.

## Test matrix

- Một issue có nhiều repair attempt được hiển thị đúng thứ tự.
- Parts không bị mất khi cập nhật repair record.
- Complete/fail giữ nguyên asset state và issue status hiện hành.
- Concurrent complete không tạo kết quả hoàn tất thứ hai.
- `repair_evidence → media_files` chịu cùng AWS S3 object health, CloudFront
  public availability, API permission, cleanup và reconciliation rule của
  Phase 1.
- `AFTER_REPAIR` không link vào failed repair; before-repair/invoice media không
  reuse sai purpose.
- Read API cũ không bị phá bởi repair record mới.
- Cost, warranty và test result validate đúng boundary.

## Gate acceptance

Phase 3 đạt khi:

- Có timeline audit đủ để biết ai xử lý, lúc nào, với kết quả nào.
- Parts và commercial fields có thể query/report mà không parse text tự do.
- State transition MVP vẫn đúng trong normal, fail và retry cases.
- Có after-repair evidence theo quyền; before-repair/invoice evidence chỉ là gate
  nếu scope tương ứng đã được activation.
- Không tạo workflow provider approval hoặc document management ngoài scope.

## Không làm trong phase này

- Không làm repair handback tự động.
- Không thêm `WAITING_HANDBACK`.
- Không làm invoice/document repository riêng.
- Không thêm role IT Support.
- Không thêm repair-failed evidence hoặc reuse `AFTER_REPAIR` cho failed repair
  nếu chưa có requirement/purpose riêng.
