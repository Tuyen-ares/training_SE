# Phase 1 — Image Evidence Core

**Status: FUTURE / NOT IMPLEMENTED**
**Phụ thuộc: Phase 0 đã đạt activation gate**

## Mục tiêu

Implement image evidence optional cho handover, return và post-repair mà không
phá lifecycle MVP hiện tại. Phase 1 quyết định technical HOW cho bốn conceptual
entity đã được Phase 0 selected.

## Phạm vi

Phase 1 implement image evidence cho:

1. Handover.
2. Return.
3. Post-repair.

Evidence là optional; không có ảnh vẫn handover/return bình thường. Phase 1
không có custody entity riêng, inspection entity riêng, acknowledgement,
`handover_records` hoặc `return_records`.

## State transition phải giữ nguyên

```text
RESERVED → BORROWED
BORROWED → AVAILABLE       (normal return)
BORROWED → DAMAGED         (damaged return)
```

> Với damaged return, history update, issue creation và asset transition vẫn phải
> là một business transaction nhất quán như MVP.

## Conceptual entities và relations

Phase 1 implement đúng bốn entity:

```text
media_files
handover_evidence
return_evidence
repair_evidence
```

Relations:

```text
handover_evidence → borrow_histories
return_evidence   → borrow_histories
repair_evidence   → asset_issues
```

Trách nhiệm:

- `media_files` chỉ giữ generic file metadata.
- `handover_evidence` là typed relation cho ảnh handover.
- `return_evidence` là typed relation cho ảnh return.
- `repair_evidence` là typed relation cho ảnh post-repair, với purpose tối
  thiểu như `AFTER_REPAIR`; exact representation thuộc technical design.

### Repair migration boundary

Relation ban đầu là:

```text
asset_issues → repair_evidence → media_files
```

Phase 1 không được yêu cầu `repair_records`, thêm `repair_record_id`, tạo
structured repair attempt hoặc thiết kế API chỉ hoạt động khi repair record tồn
tại. Phase 3 mới mở migration/design review nếu structured Repair Audit cần phân
biệt nhiều repair attempt; khi đó mới xem xét relation:

```text
repair_records → repair_evidence → media_files
```

## Detailed technical design

Phase 1 chịu trách nhiệm quyết định và ghi lại:

- Exact columns, datatypes, PK/FK, cardinality, indexes, unique constraints và
  `ON DELETE`.
- Prisma models và migration order.
- Exact repair purpose representation.
- Media reuse enforcement giữa handover, return và repair.
- Legacy handling, không backfill evidence giả.

Conceptual `media_files` fields:

```text
id
storage_path
original_name
mime_type
size_bytes
uploaded_by
created_at
```

Chỉ thêm checksum nếu technical design chứng minh cần.

## Storage technical contract

Phase 1 phải thiết kế và verify:

- AWS SDK S3, AWS region, private bucket, CloudFront distribution/OAC,
  credentials/env variables và `PUBLIC_MEDIA_BASE_URL`.
- BigIn upload/delete/verify endpoints, presigned PUT generation, public URL
  construction và S3 CORS.
- MIME whitelist, max image size/count.
- UUID hoặc random filename strategy và safe `storage_path` format.
- Checksum nếu chọn, retry, orphan cleanup và missing-object reconciliation.
- Concurrency và idempotency cho upload/link/delete.

Database ưu tiên chỉ lưu `storage_path`; API derive URL:

```text
PUBLIC_MEDIA_BASE_URL + storage_path
```

Binary nằm ở private S3. CloudFront public/stable `GET`/`HEAD` URL không có
BigIn authorization; upload, object verification và delete vẫn
permission-controlled qua authenticated BigIn API/backend-controlled storage
access. Không dùng presigned GET, CloudFront signed URL, temporary access URL
hoặc signed URL lưu trong database. Không expose AWS credentials cho frontend.

S3 phải giữ Block Public Access, Bucket owner enforced và không dùng public ACL.
Bucket policy chỉ cho CloudFront OAC đọc object; IAM backend chỉ được cấp quyền
cần cho upload/delete/verify. Backend cấp presigned PUT có thời hạn, giới hạn
MIME và kích thước theo upload policy; Vue upload trực tiếp lên S3.

`storage_path` phải dùng UUID hoặc random identifier, ví dụ:

```text
evidence/2026/08/<uuid>.jpg
```

Path không được chứa employee name, asset serial, issue description, email,
request detail nhạy cảm hoặc business text khác. UUID chỉ giảm khả năng đoán
URL; không tạo privacy/security boundary. Không parse path để xác định ownership.

## Ownership và access boundary

Các thao tác qua BigIn API dùng access chain:

```text
media_files
→ typed evidence link
→ borrow_history hoặc asset_issue
→ BigIn API permission/business relationship
```

Không dùng polymorphic `owner_type`/`owner_id`, nullable business FK trong
`media_files` hoặc storage path để authorize. Public object GET là lớp riêng và
không kế thừa authorization của BigIn API.

## Backend implementation slices

1. Tạo model/repository cho `media_files` và ba typed evidence relation theo
   technical design.
2. Mở rộng handover/return và post-repair service với image evidence optional.
3. Tạo upload/read/delete behavior theo storage contract; theo dõi orphan và
   missing object.
4. Bảo vệ API metadata/link/upload/delete bằng permission hiện có và
   ownership/business relationship.
5. Giữ API MVP tương thích khi client không gửi evidence.

## Frontend implementation slices

- Upload/preview handover image.
- Upload/preview return image.
- Upload/preview post-repair image.
- Retry, remove theo delete policy và mutation loading/error state.
- Không có acknowledgement UI hoặc UI cho custody entity riêng.
- Không expose storage credentials.

## Test matrix

- Handover/return không có evidence vẫn thành công.
- Post-repair image link đúng `asset_issue`.
- Không có polymorphic owner fields hoặc nullable business FK trong
  `media_files`.
- CloudFront URL đọc trực tiếp được; direct S3 URL bị từ chối; BigIn API
  upload/delete vẫn permission-controlled.
- Presigned PUT hết hạn đúng thời gian; PUT sai MIME hoặc vượt kích thước bị từ
  chối.
- Frontend không thấy AWS secret; delete không thể thực hiện trực tiếp từ
  frontend.
- Upload thành công nhưng ghi database lỗi được xử lý orphan; reconciliation
  phát hiện lỗi CloudFront/S3 và missing object.
- Path không chứa business-sensitive identifiers.
- Upload/DB failure không tạo trạng thái nửa thành công.
- Orphan cleanup và missing-object reconciliation hoạt động.
- Không reuse media giữa handover, return và repair.
- Legacy history không bị backfill ảnh giả.
- Concurrent upload/link/delete được xử lý idempotent.

## Gate acceptance

Phase 1 đạt khi:

- Bốn entity và typed relations được implement theo technical design.
- Có thể upload/preview image optional cho handover, return và post-repair.
- Lifecycle MVP không đổi khi evidence vắng mặt.
- Public media availability, permission-controlled mutations, failure handling
  và reconciliation đã được verified.
- Có runbook xử lý failed upload, orphan object và missing object.
- Phase 1 không phụ thuộc `repair_records`.

## Không làm trong phase này

- Không hỗ trợ video.
- Không tạo custody, inspection hoặc acknowledgement entity.
- Không tạo `handover_records`, `return_records` hoặc `repair_records`.
- Không làm checklist phụ kiện đầy đủ.
- Không làm receipt/PDF.
- Không thêm `WAITING_HANDBACK`.
- Không tạo immutable audit log hoàn chỉnh.
