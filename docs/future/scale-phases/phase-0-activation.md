# Phase 0 — Activation và chốt thiết kế

**Status: FUTURE / NOT IMPLEMENTED**
**Loại phase: decision gate, chưa code**

## Mục tiêu

Chuyển architecture/design đã review thành một bộ requirement và contract active
có thể giao implementation. Phase 0 xác nhận WHAT/WHY và activation gate, không
tạo bảng, route, permission hay UI. Technical HOW đã được approved trong Phase
1 và không được redesign ngầm khi activation.

## Quyết định nền đã chốt

- Giữ schema lean với một media registry và ba typed evidence relations:
  `media_files`, `handover_evidence`, `return_evidence` và `repair_evidence`.
- `media_files` đồng thời là registry/lifecycle dùng chung cho asset image và
  user avatar; không tạo `asset_images` hoặc `user_avatars` many-to-many table.
- Asset/user giữ legacy URL và thêm nullable media FK khi Phase 1 được
  implemented; không backfill trong phase này.
- Evidence là optional, Phase 1 chỉ hỗ trợ image cho handover, return và
  successful Complete Repair.
- Lifecycle reference của handover/return vẫn là `borrow_histories`; không tạo
  custody entity riêng.
- Không tạo `handover_records`, `return_records`, `repair_records` hoặc
  acknowledgement entity trong Phase 1.
- Accessories bắt đầu bằng checklist; thiếu/hỏng không chặn return.
- Repair Complete đưa asset về `AVAILABLE`; employee tạo request mới.
- Chưa thêm role IT Support; capability tiếp tục đến từ permission.
- Receipt/PDF, retention sâu và immutable audit log để Phase 5.

### Locked architecture

```text
media_files
├── handover_evidence
│   └── borrow_histories
├── return_evidence
│   └── borrow_histories
├── repair_evidence
│   └── asset_issues
├── assets.image_media_id
└── users.avatar_media_id
```

Trách nhiệm conceptual:

- `media_files`: object metadata và upload lifecycle `PENDING`/`READY`.
- `handover_evidence`: typed relation giữa `borrow_histories` và
  `media_files`.
- `return_evidence`: typed relation giữa `borrow_histories` và `media_files`.
- `repair_evidence`: typed relation giữa `asset_issues` và `media_files`.
- `assets.image_media_id`/`users.avatar_media_id`: one-image media FK cho upload
  mới; `image_url`/`avatar_url` tiếp tục là legacy fallback.

### Repair evidence boundary

Phase 1 bắt buộc hỗ trợ post-repair image theo relation ban đầu:

```text
asset_issues → repair_evidence → media_files
```

Phase 1 không tạo `repair_records`, không dùng `repair_record_id` và không
thiết kế API/schema khiến structured repair record là dependency bắt buộc. Nếu
Phase 3 thực sự cần phân biệt nhiều repair attempt, Phase 3 sẽ mở migration và
design review riêng để quyết định có chuyển ownership sang `repair_records` hay
không.

### Public storage architecture

Phase 0 lock các boundary sau:

- Binary nằm ở private AWS S3 bucket; MariaDB chỉ chứa metadata và typed
  relations.
- Read dùng public/stable CloudFront URL với `GET`/`HEAD`; không dùng presigned
  GET, CloudFront signed URL hoặc temporary access URL.
- Vue xin presigned PUT từ authenticated BigIn API. Backend tạo
  `media_files PENDING` với UUID `storage_path`, sau đó Vue upload trực tiếp lên
  S3. Complete dùng `HeadObject` verify metadata để chuyển `READY`; business
  confirm mới claim và link media. Delete vẫn qua authenticated BigIn
  API/backend-controlled storage access.
- Không expose storage secret cho frontend.
- `storage_path` phải dùng UUID hoặc random identifier, ví dụ
  `evidence/2026/08/<uuid>.jpg`.
- `storage_path` không chứa employee name, asset serial, issue description,
  email, request detail nhạy cảm hoặc business text khác.
- S3 dùng Object Ownership `Bucket owner enforced`, không dùng public ACL và
  không tắt S3 Block Public Access. Chỉ IAM backend được upload/delete/verify;
  CloudFront service principal được `s3:GetObject` theo bucket policy scope bằng
  distribution ARN và distribution dùng OAC khi gọi S3.
- UUID chỉ giảm khả năng đoán URL; không biến public object thành private.

Architecture lock:

```text
S3 private bucket
       ↑
CloudFront + OAC
       ↑
public stable media URL

Vue → BigIn API → presigned PUT → S3
```

Public URL được derive bằng cách normalize dấu `/`:

```text
PUBLIC_MEDIA_BASE_URL + "/" + storage_path
```

Database ưu tiên chỉ giữ `storage_path`, không lưu signed URL.

### Ownership và access

Access chain cho thao tác qua BigIn API:

```text
media_files
→ typed evidence link
→ borrow_history hoặc asset_issue
→ BigIn API permission/business relationship
```

Asset image/avatar dùng typed media FK trực tiếp trên `assets`/`users` và read
fallback về legacy URL. Không dùng `owner_type`, `owner_id`, `target_type`,
`target_id`, nullable business target FK trong `media_files`, hoặc
`storage_path` để authorize ownership. Public object GET vẫn là lớp truy cập
riêng, không kế thừa authorization của BigIn API.

## Việc phải hoàn tất trước khi mở Phase 1

### 1. Chuyển thành tài liệu active

Tạo hoặc cập nhật bộ tài liệu hiện hành gồm:

- Requirement/user story và acceptance criteria cho image evidence handover,
  return, successful Complete Repair, asset image và user avatar.
- Business rules cho evidence optional, typed relations và repair evidence.
- API contract, API catalog và OpenAPI.
- Frontend screen flow, permission states và error states.
- Data model và migration strategy.

Các tài liệu active phải nói rõ đây là scope mới đã được kích hoạt; không sửa
`docs/future/**` thành source of truth cho code.

### 2. Activate schema design đã review

Bộ schema logical đã được approved trong Phase 1:

- `media_files` cho object metadata/lifecycle, purpose, uploader và one-time
  claim.
- `handover_evidence` và `return_evidence` cho typed relation tới
  `borrow_histories`.
- `repair_evidence` cho typed relation tới `asset_issues`.
- Nullable unique media FK trên `assets`/`users`, đồng thời giữ legacy URL.

Không thêm polymorphic target/owner, upload session ID, `original_name`,
`handover_records`, `return_records`, `repair_records` hoặc acknowledgement
entity trong Phase 1. Chưa mặc định tạo `repair_documents`, `audit_events`,
receipt snapshot hoặc managed accessory tables.

### 3. Activate interface storage

Phase 1 là technical source of truth cho AWS/media contract. Khi activation,
active requirement/contract phải phản ánh đúng:

- AWS region, S3 bucket private, CloudFront distribution, OAC, SDK, IAM
  credentials/env variables và `PUBLIC_MEDIA_BASE_URL`.
- Presigned PUT/upload, object verification, delete endpoint, public URL
  construction và S3 CORS.
- Purpose policy, MIME, kích thước/count tối đa, UUID key và MIME-derived
  extension.
- Presign không có generic target; complete chuyển `PENDING → READY`; business
  transaction claim bằng `linked_at` và tạo typed relation/FK.
- Cách xử lý upload thành công nhưng ghi metadata/lifecycle thất bại.
- Cách retry, cancel, manual cleanup và read/audit referenced media, gồm stale
  `PENDING`, never-linked `READY` và detached replacement candidates.

Không lưu signed URL; public URL không có BigIn authorization. Không thay thế
contract đã approved bằng một storage/provider abstraction mới trong activation
nếu chưa mở design review riêng.

### 4. Chốt permission matrix

Phải ghi rõ cho từng thao tác qua BigIn API:

- Actor vận hành được tạo/xem handover evidence.
- Actor vận hành được tạo/xem return evidence.
- Người mượn được xem evidence của borrow history/request của mình.
- Người xử lý issue/repair được xem evidence repair.
- Actor có permission asset create/update tương ứng mới được presign/link
  `ASSET_IMAGE`.
- Admin user create/update hoặc authenticated self-profile owner tương ứng mới
  được presign/link `USER_AVATAR`.
- User không thuộc quan hệ nghiệp vụ nhận `403` khi gọi API metadata/link.

Không thêm `evidence.view` hoặc role IT Support nếu chưa có requirement chứng
minh nhu cầu.

## Gate acceptance

Phase 0 đạt khi:

- Một media registry, ba typed evidence relations và hybrid asset/user media FK
  model được selected.
- Không còn custody/acknowledgement requirement trong scope Phase 1.
- Public storage trade-off, stable URL và safe path principle được ghi rõ.
- Repair evidence initial ownership là `asset_issues`.
- Requirement, business rule, contract, schema và frontend spec không mâu thuẫn.
- Có permission matrix cho từng read/write operation.
- Có migration/backward-compatibility strategy cho dữ liệu MVP cũ.
- Active docs phản ánh `mediaId`, purpose, `PENDING`/`READY`, atomic claim, typed
  evidence và hybrid asset/avatar model.
- Active docs tiếp nhận rule đã approved cho cancel/delete, orphan cleanup,
  missing-object audit và legacy fallback.
- Có test matrix cho permission, concurrency, upload failure và legacy API.
- Người review xác nhận Phase 1 có thể bắt đầu mà không redesign lại architecture
  hoặc đoán thêm quyết định WHAT/WHY.

### AWS activation gate

Trước khi mở Phase 1 phải xác nhận:

- AWS account và billing owner đã xác định; có budget alert hoặc cost
  monitoring.
- S3 bucket private đã tạo với Block Public Access và Bucket owner enforced.
- CloudFront distribution và OAC đã liên kết với bucket.
- Bucket policy chỉ cho CloudFront service principal đọc trong scope
  distribution ARN/OAC; IAM backend có đúng quyền upload/delete/verify.
- S3 CORS cho phép frontend thực hiện presigned PUT.

## Không làm trong phase này

- Không tạo Prisma model/migration.
- Không thêm endpoint upload.
- Không đổi state machine MVP.
- Không backfill evidence cho history cũ.
- Không đổi tên permission legacy.
- Không tạo exact Prisma columns/indexes/cascade trong Phase 0; implementation
  task phải map logical model đã approved trong Phase 1 theo repository
  convention, không mở lại architecture.
