# Phase 1 — Image Evidence Core

**Status: FUTURE / NOT IMPLEMENTED**

**Design status: REVIEWED / APPROVED FOR PHASE 1**

**Phụ thuộc: Phase 0 activation gate và việc chuyển scope sang tài liệu active**

Tài liệu này là architecture/design đã được chốt cho Phase 1. Trạng thái
`REVIEWED / APPROVED` chỉ xác nhận thiết kế; không có nghĩa feature, AWS
resource, database, API hoặc UI đã được triển khai. Theo convention của thư mục
`docs/future/**`, tài liệu này không phải requirement hiện hành cho đến khi scope
được chuyển sang bộ tài liệu active.

## 1. Goals

- Hỗ trợ image evidence optional cho handover, normal return, damaged return và
  complete repair mà không đổi lifecycle MVP hiện tại.
- Dùng private AWS S3 để lưu binary và public CloudFront + OAC để đọc ảnh.
- Cho frontend upload binary trực tiếp bằng presigned PUT mà không nhận AWS
  credential.
- Dùng `media_files` làm registry/lifecycle của object vật lý và typed relation
  tables để giữ FK/domain clarity.
- Hỗ trợ một ảnh chính cho asset và một avatar cho user theo mô hình tương thích
  với dữ liệu URL hiện có.
- Có lifecycle đủ đơn giản để retry, cancel và cleanup orphan media trong MVP.

Evidence vẫn optional. Handover, return và complete repair không gửi media vẫn
phải hoạt động như trước.

## 2. Non-goals

Phase này không:

- Làm S3 bucket public, public ACL hoặc tắt Block Public Access.
- Dùng presigned GET, CloudFront signed URL, custom CloudFront domain, Route 53
  hoặc ACM.
- Dùng OIDC/STS cho Render Free; thêm background worker hoặc Render Cron.
- Kiểm tra magic bytes, decode/reprocess image, antivirus hoặc content
  moderation.
- Hỗ trợ video, PDF hoặc document repository.
- Tạo `handover_records`, `return_records`, `repair_records`, custody,
  inspection hoặc acknowledgement entity.
- Tạo evidence cho repair failed.
- Tạo polymorphic target/owner hoặc generic evidence table.
- Backfill legacy `image_url`, `avatar_url` hoặc evidence giả.
- Thêm Object Lock, versioning hoặc checksum binding chỉ để chống reuse
  presigned URL trong MVP.

State transition hiện tại phải giữ nguyên:

```text
RESERVED → BORROWED
BORROWED → AVAILABLE       (normal return)
BORROWED → DAMAGED         (damaged return)
```

Complete Repair thành công tiếp tục đưa issue/asset về state theo flow hiện
hành. Evidence không được tạo một lifecycle nghiệp vụ song song.

## 3. Architecture

```text
Frontend
  → BigIn API: xin presigned PUT
  → BigIn API: auth, permission, validate metadata khai báo
  → media_files PENDING + UUID storage_path
  ← mediaId + presigned PUT
  → private S3: PUT binary
  → BigIn API: complete(mediaId)
  → S3 HeadObject: verify object/metadata
  → media_files READY
  → BigIn API: business confirm với optional mediaIds
  → claim media + business mutation + typed relation trong một DB transaction

Browser
  → public CloudFront URL
  → CloudFront OAC
  → private S3 origin
```

Boundary đã chốt:

- S3 private, Block Public Access bật và Object Ownership dùng `Bucket owner
  enforced`.
- CloudFront public `GET`/`HEAD`; distribution dùng OAC để đọc private S3
  origin.
- Presigned PUT chỉ dùng cho upload. Public read không dùng presigned GET.
- AWS SDK và IAM access key chỉ tồn tại ở backend.
- Frontend không chứa hoặc nhận `AWS_ACCESS_KEY_ID` hay
  `AWS_SECRET_ACCESS_KEY`.
- Render Free backend dùng IAM user access key trong secret environment
  variables; không dùng root credential, OIDC hoặc STS trong MVP.

## 4. AWS infrastructure

Các resource/configuration phải tồn tại trước implementation verification:

- Một S3 bucket private trong region đã chọn, bật Block Public Access và Bucket
  owner enforced.
- Một CloudFront distribution dùng S3 REST origin, không dùng S3 website
  endpoint.
- Một OAC liên kết với distribution; bucket policy cấp `s3:GetObject` cho
  CloudFront service principal và scope bằng distribution ARN theo phạm vi cần
  thiết.
- CloudFront behavior cho public `GET`/`HEAD`; viewer không được upload/delete
  qua CloudFront.
- S3 CORS chỉ cho frontend origin được phép thực hiện `PUT` với các signed
  headers cần thiết, tối thiểu gồm `Content-Type` và `Cache-Control` theo contract
  này.
- Không cần `ExposeHeaders: ETag` khi frontend chỉ kiểm tra `response.ok`.
- IAM user dành cho backend Render, secret env và cost/budget monitoring.

Environment contract:

```env
AWS_REGION=
AWS_S3_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

PUBLIC_MEDIA_BASE_URL=

MEDIA_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp
MEDIA_MAX_IMAGE_SIZE_BYTES=10485760
MEDIA_MAX_EVIDENCE_IMAGE_COUNT=10
MEDIA_PRESIGNED_PUT_EXPIRES_SECONDS=300
```

`PUBLIC_MEDIA_BASE_URL` là CloudFront default domain trong MVP. Credential là
server-side secret, không phải frontend environment variable và không được log.

## 5. Object key convention

Backend luôn tạo UUID/random key mới:

```text
evidence/handover/YYYY/MM/<uuid>.<ext>
evidence/return/YYYY/MM/<uuid>.<ext>
evidence/repair/YYYY/MM/<uuid>.<ext>
asset-images/<uuid>.<ext>
user-avatars/<uuid>.<ext>
```

Rules:

- Extension được derive từ MIME whitelist; không tin extension của filename do
  client gửi.
- Key không chứa email, username, employee code, asset serial, description,
  business entity ID không cần thiết hoặc PII/business-sensitive text khác.
- Thay ảnh luôn tạo key mới; application không overwrite/reuse key cũ.
- UUID giảm collision và khả năng đoán URL nhưng không phải privacy boundary.
- Không parse key để suy ra ownership hoặc authorization.
- Object được upload với:

```text
Cache-Control: public,max-age=31536000,immutable
```

Original filename không được lưu trong schema MVP. Đây là quyết định chủ ý vì
UI hiện không cần hiển thị filename, storage dùng UUID và filename có thể chứa
PII. Chỉ bổ sung sau nếu có business requirement riêng.

## 6. `media_files` model

`media_files` là registry và upload lifecycle của file vật lý trên S3:

```text
media_files
- id                         primary key; API gọi là mediaId
- storage_path               UNIQUE NOT NULL
- mime_type                  NOT NULL
- size_bytes                 NOT NULL
- purpose                    NOT NULL
- upload_status              NOT NULL
- uploaded_by                FK users.id NOT NULL
- created_at                 NOT NULL
- uploaded_at                NULL
- linked_at                  NULL
```

Không tạo cột `upload_id`, `target_type`, `target_id`, `owner_type`, `owner_id`
hoặc `original_name`.

`upload_status` chỉ có:

```text
PENDING
READY
```

- `PENDING`: backend đã tạo media row và cấp presigned PUT nhưng chưa verify
  upload thành công.
- `READY`: complete đã dùng `HeadObject` xác nhận object và metadata hợp lệ.

Không thêm `LINKED`, `FAILED`, `CANCELLED` hoặc `EXPIRED`:

- linked state được biểu diễn bằng `linked_at` cùng relation/FK thật;
- failed upload trở thành stale `PENDING` để cleanup;
- cancel thành công xóa object và media row;
- expiry được suy ra từ `created_at` và presign TTL.

`linked_at` là internal lifecycle timestamp để claim media đúng một lần, không
phải UI status và không bắt buộc trả frontend.

## 7. Evidence relations

```text
handover_evidence
- id
- borrow_history_id          FK borrow_histories.id NOT NULL
- media_file_id              FK media_files.id UNIQUE NOT NULL
- created_at                 NOT NULL

return_evidence
- id
- borrow_history_id          FK borrow_histories.id NOT NULL
- media_file_id              FK media_files.id UNIQUE NOT NULL
- created_at                 NOT NULL

repair_evidence
- id
- asset_issue_id             FK asset_issues.id NOT NULL
- media_file_id              FK media_files.id UNIQUE NOT NULL
- created_at                 NOT NULL
```

Cardinality: một business parent có thể có nhiều evidence row; một media chỉ
được dùng bởi tối đa một typed relation.

Mental model:

```text
media_files    = file vật lý + upload lifecycle
*_evidence     = quan hệ giữa file và business record
```

Không tạo generic `evidence(target_type, target_id, ...)`. Current repository
dùng `borrow_histories` làm parent của handover/return và `asset_issues` làm
parent của repair evidence. Phase 1 không phụ thuộc `repair_records`.

## 8. Asset/avatar compatibility

Mỗi asset có tối đa một ảnh chính và mỗi user có tối đa một avatar, nên không
tạo `asset_images` hoặc `user_avatars` many-to-many table.

Model tương thích:

```text
assets
- image_url                  legacy fallback, giữ nguyên
- image_media_id             nullable unique FK media_files.id

users
- avatar_url                 legacy fallback, giữ nguyên
- avatar_media_id            nullable unique FK media_files.id
```

Không backfill dữ liệu legacy trong phase này. Read resolution:

```text
nếu media FK tồn tại:
    PUBLIC_MEDIA_BASE_URL + "/" + media_files.storage_path
ngược lại:
    image_url/avatar_url legacy
```

Implementation phải normalize dấu `/`: base URL không có trailing slash và
`storage_path` không có leading slash. API read bên ngoài tiếp tục trả
`imageUrl`/`avatarUrl`, để frontend không cần biết dữ liệu đến từ media FK hay
legacy URL. Upload mới ưu tiên media FK và không lưu hard-coded CloudFront full
URL vào legacy field.

Khi thay ảnh, media mới dùng key mới. Media cũ được detach khỏi FK và trở thành
replacement-cleanup candidate; không overwrite object cũ.

## 9. Purpose policies

`purpose` là field database, không phải environment variable:

```text
HANDOVER
RETURN
AFTER_REPAIR
ASSET_IMAGE
USER_AVATAR
```

Backend dùng policy map theo purpose để chọn prefix, permission, MIME whitelist,
max size, max count và business flow được phép link. Baseline mapping:

| Purpose | Prefix | Permission/link boundary | Max count |
|---|---|---|---|
| `HANDOVER` | `evidence/handover/...` | `asset.checkout`; handover confirm | `MEDIA_MAX_EVIDENCE_IMAGE_COUNT` |
| `RETURN` | `evidence/return/...` | `asset.checkin`; normal/damaged return | `MEDIA_MAX_EVIDENCE_IMAGE_COUNT` |
| `AFTER_REPAIR` | `evidence/repair/...` | `asset_issue.close`; successful Complete Repair only | `MEDIA_MAX_EVIDENCE_IMAGE_COUNT` |
| `ASSET_IMAGE` | `asset-images/...` | permission của asset create/update tương ứng | `1` |
| `USER_AVATAR` | `user-avatars/...` | user create/update permission hoặc self-profile ownership tương ứng | `1` |

MVP có thể dùng cùng `MEDIA_ALLOWED_MIME_TYPES` và
`MEDIA_MAX_IMAGE_SIZE_BYTES` cho mọi purpose, nhưng validation vẫn đi qua policy
map để không cho media cross-purpose. Ví dụ `USER_AVATAR` không được link làm
`HANDOVER` evidence.

Generic presign không có target nên max count theo một business event/entity
được enforce tại business mutation/link, không chỉ ở presign.

## 10. Upload lifecycle

```text
presign
  → media PENDING
  → frontend PUT S3
  → complete + HeadObject
  → media READY
  → user business confirm
  → atomic media claim + business mutation + evidence/FK link
```

Chi tiết:

1. Frontend validate sơ bộ file type/size rồi gọi presign.
2. Backend auth, kiểm permission theo purpose, whitelist MIME và declared size.
3. Backend tạo UUID `storage_path` và `media_files` ở `PENDING`.
4. Backend ký presigned PUT khoảng 300 giây, gồm các required headers.
5. Frontend `PUT` binary trực tiếp lên S3 và chỉ cần kiểm `response.ok`.
6. Frontend gọi complete bằng `mediaId`.
7. Backend `HeadObject`, verify metadata rồi chuyển `PENDING → READY`.
8. User thực hiện business confirm với optional `mediaIds`.
9. Business transaction claim và link media.

Declared `sizeBytes` được reject trước presign nếu vượt policy; complete đối
chiếu `ContentLength` sau upload. Basic presigned PUT contract này không được mô
tả như một S3 `content-length-range` policy. Media mismatch không được chuyển
sang `READY`; row giữ `PENDING` để cancel/cleanup và object có thể được
best-effort delete.

Frontend preview trước complete dùng `URL.createObjectURL(file)`. Không request
CloudFront URL trước khi object READY, tránh preview phụ thuộc object chưa tồn
tại và giảm rủi ro CloudFront cache error response.

## 11. API contracts

Các JSON dưới đây mô tả data payload; implementation phải giữ response envelope
convention hiện hành của BigIn API.

### Presign

```http
POST /api/media/presign
```

```json
{
  "purpose": "HANDOVER",
  "mimeType": "image/jpeg",
  "sizeBytes": 234567
}
```

```json
{
  "mediaId": 10,
  "uploadUrl": "...",
  "expiresAt": "2026-08-17T10:05:00.000Z",
  "requiredHeaders": {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public,max-age=31536000,immutable"
  }
}
```

Request không có `targetId`, `targetType`, `originalName` hoặc `uploadId`.
Response không trả `publicUrl` hoặc AWS credential. Frontend phải gửi đúng
`requiredHeaders` khi PUT.

### Complete

```http
POST /api/media/:mediaId/complete
```

Body rỗng. Backend:

1. Check authenticated user và load media.
2. Check `uploaded_by` và upload status.
3. Gọi `HeadObject(storage_path)`.
4. Verify object tồn tại, `ContentLength`, `ContentType` metadata và
   `CacheControl` metadata nếu header đó được ký.
5. Nếu hợp lệ, chuyển `PENDING → READY` và set `uploaded_at`.
6. Trả canonical CloudFront URL.

```json
{
  "mediaId": 10,
  "status": "READY",
  "publicUrl": "https://dxxxx.cloudfront.net/evidence/handover/2026/08/uuid.jpg"
}
```

Complete idempotent: `PENDING` hợp lệ được verify rồi chuyển `READY`; `READY`
của cùng owner trả lại canonical response. `HeadObject` chỉ đọc object metadata,
không đọc body và không chứng minh bytes thật là JPEG/PNG. Magic-byte validation
hoặc decode/reprocess không thuộc MVP.

### Cancel

```http
DELETE /api/media/:mediaId
```

Chỉ uploader được cancel media có `linked_at IS NULL`. Frontend không có S3
delete permission. Backend gọi `DeleteObject`; chỉ xóa media row khi object đã
xóa, không tồn tại, hoặc kết quả khác được xác định an toàn. Nếu S3 delete lỗi
tạm thời, giữ row để không làm mất `storage_path` phục vụ retry/cleanup. Không
cần `CANCELLED` status.

### Business requests

Handover, normal return, damaged return và successful Complete Repair nhận thêm
field optional:

```json
{
  "mediaIds": [10, 11]
}
```

Request cũ không gửi `mediaIds` vẫn hợp lệ. Asset/user create/update nhận một
`imageMediaId`/`avatarMediaId` optional tương ứng; media ID mới và legacy URL
không được gửi đồng thời cho cùng field.

## 12. Business linking and claim semantics

Generic presign không nhận `targetId`/`targetType` vì target không tồn tại nhất
quán ở thời điểm upload:

- Handover: `borrow_history` chưa tồn tại.
- Return: `borrow_history` đã tồn tại.
- Repair: `asset_issue` đã tồn tại.
- Asset create: asset chưa tồn tại.
- User create: user chưa tồn tại.

Backend validate business target/state tại business mutation. Với mỗi media ID,
backend phải kiểm tra:

- media tồn tại và thuộc authenticated uploader theo rule của flow;
- `purpose` đúng;
- `upload_status = READY`;
- `linked_at IS NULL`;
- số lượng không vượt policy;
- business entity/state và permission hiện tại hợp lệ.

Claim dùng conditional atomic update tương đương:

```sql
UPDATE media_files
SET linked_at = NOW()
WHERE id = ?
  AND upload_status = 'READY'
  AND linked_at IS NULL
  AND uploaded_by = ?
  AND purpose = ?;
```

Nếu affected rows khác `1`, reject claim. Claim, lifecycle mutation hiện tại và
evidence relation/FK update phải nằm trong cùng database transaction do
coordinating business service sở hữu.

```text
Handover transaction:
claim HANDOVER media
→ thực hiện lifecycle handover
→ tạo borrow_history
→ insert handover_evidence bằng borrow_history.id vừa tạo
→ commit

Return transaction:
claim RETURN media
→ normal/damaged return lifecycle trên borrow_history hiện có
→ insert return_evidence
→ commit

Complete Repair transaction:
claim AFTER_REPAIR media
→ complete repair lifecycle thành công
→ insert repair_evidence vào asset_issue
→ commit
```

Nếu transaction rollback, `linked_at` và relation cùng rollback; media vẫn
`READY` để retry hoặc cleanup.

## 13. Business confirm terminology

Document/API/UI phải phân biệt:

- **complete upload**: verify object và chuyển media thành `READY`;
- **business confirm**: user xác nhận hành động nghiệp vụ như `Confirm
  Handover`.

Ví dụ, media `#10` có thể `READY` trước khi `borrow_history` tồn tại.
`borrow_history` chỉ được tạo khi handover business transaction thành công; sau
đó `handover_evidence` mới có parent FK. Đây là một lý do chính cần
`media_files` độc lập với typed evidence relations.

Media trở thành orphan khi đã upload nhưng không bao giờ được business confirm,
business transaction liên tục thất bại/bị bỏ, hoặc media cũ bị detach khi thay
asset image/avatar.

## 14. History/read model

Evidence phải đọc lại được sau nghiệp vụ:

- Borrow history detail có `handoverEvidence[]` và `returnEvidence[]`.
- Asset issue detail có `repairEvidence[]`.

Mỗi item tối thiểu:

```json
{
  "mediaId": 10,
  "mimeType": "image/jpeg",
  "sizeBytes": 234567,
  "uploadedAt": "2026-08-17T10:01:00.000Z",
  "publicUrl": "https://dxxxx.cloudfront.net/evidence/handover/2026/08/uuid.jpg"
}
```

Metadata/history API vẫn kiểm permission và business relationship hiện hành.
CloudFront URL là public nếu đã biết URL; nó không kế thừa BigIn authorization.
UI history/detail có thể render thumbnail và evidence theo loại nghiệp vụ.

## 15. CloudFront/cache behavior

```text
Browser GET CloudFront URL
  → cache HIT: CloudFront trả object đã cache
  → cache MISS: CloudFront dùng OAC đọc private S3
                → cache object
                → trả browser
```

Canonical public URL được compose bằng:

```text
normalize(PUBLIC_MEDIA_BASE_URL) + "/" + storage_path
```

Đây là URL composition, không phải presigned GET. Direct S3 public URL phải bị
block.

Immutable UUID key cho phép dùng:

```text
Cache-Control: public,max-age=31536000,immutable
```

CloudFront cache policy phải có Maximum TTL ít nhất `31536000` giây và không
forward query string, cookie hoặc viewer header không cần thiết vào cache key.
Thay ảnh tạo key mới nên không cần invalidation trong flow bình thường.

## 16. Security/IAM

Backend IAM policy chỉ cấp trên bucket/prefix thực sự dùng:

- `s3:PutObject` để presign/upload object.
- `s3:GetObject` để `HeadObject` verify object.
- `s3:DeleteObject` để cancel/cleanup.

Không cấp `s3:ListBucket` trong MVP vì cleanup lấy `storage_path` từ DB.
CloudFront service principal được `s3:GetObject` theo bucket policy scope bằng
distribution ARN và distribution dùng OAC khi gọi S3. Frontend không có AWS
credential hoặc S3 delete permission.

Security rules:

- Không dùng root credential.
- AWS keys chỉ nằm trong backend secret env.
- Không log credential hoặc presigned URL.
- Presigned PUT expiry mặc định khoảng 300 giây.
- Public CloudFront media đồng nghĩa ai biết URL có thể `GET`; UUID không biến
  media thành private.

Residual risk được chấp nhận trong MVP: presigned PUT có thể reuse trước khi hết
hạn và PUT lại cùng key có thể overwrite object. Mitigation là UUID key, short
expiry, application không reuse key, complete idempotent và one-time media
claim. Phase này không thêm Object Lock, versioning hoặc checksum binding.

ETag không được frontend sử dụng hoặc expose qua CORS. Không mô tả ETag mặc định
là MD5.

## 17. Cleanup/orphan strategy

MVP không thêm background worker hoặc Render Cron. Cleanup là manual,
DB-driven và phải có dry-run:

```text
media:cleanup --dry-run
media:cleanup --execute
media:audit
```

Default operational candidates được phân biệt rõ:

### A. Stale upload

```text
upload_status = PENDING
+ quá presign TTL/grace, mặc định khoảng 15 phút
→ stale upload candidate
```

### B. Never-linked orphan

```text
upload_status = READY
+ linked_at IS NULL
+ không có handover/return/repair evidence relation
+ không có assets.image_media_id/users.avatar_media_id reference
+ quá grace period, mặc định khoảng 24 giờ
→ never-linked orphan candidate
```

### C. Detached replacement

```text
upload_status = READY
+ linked_at IS NOT NULL
+ không còn bất kỳ evidence relation hoặc asset/user media FK reference nào
→ detached replacement candidate
```

`linked_at IS NOT NULL` chỉ chứng minh media đã từng được claim; nó không chứng
minh media hiện vẫn được sử dụng. Source of truth cuối cùng cho “currently
referenced” là ba typed evidence relations và `assets.image_media_id`/
`users.avatar_media_id`.

15 phút và 24 giờ là MVP operational defaults, có thể cấu hình; chúng không
phải business status hoặc lý do thêm `EXPIRED`.

Cleanup lấy `storage_path` từ DB, không list bucket. Trước mỗi `DeleteObject`,
command phải lock/recheck media row và toàn bộ typed evidence relations cùng
asset/user media FKs. Cleanup không được dùng `linked_at IS NOT NULL` làm bằng
chứng object còn được tham chiếu. Recheck phải ngăn xóa media vừa được reference
lại hoặc đang race với business transaction khác. Chỉ xóa DB row sau khi S3
delete thành công hoặc object đã không tồn tại.

`media:audit` là read-only: đọc referenced media từ DB, gọi `HeadObject`, báo
missing object/metadata mismatch và không tự sửa DB.

Giới hạn đã biết: schema MVP không có `detached_at`, nên không thể tự suy ra
chính xác grace period tính từ lúc asset/avatar bị detach. Vì cleanup là manual,
detached replacement phải được report thành nhóm riêng và operator chọn thời
điểm execute. Phase này không thêm `detached_at`, status mới hoặc lifecycle
transition mới. Nếu sau này cần scheduled cleanup với grace chính xác, việc thêm
detach timestamp là scope riêng.

## 18. Compatibility

- Evidence và `mediaIds` optional; request body cũ vẫn hợp lệ.
- Không đổi lifecycle handover, normal return, damaged return hoặc repair.
- Giữ `assets.image_url` và `users.avatar_url` làm legacy fallback; không
  backfill.
- Read API tiếp tục expose `imageUrl` và `avatarUrl`.
- Legacy history không được backfill evidence giả.
- Không thay endpoint cũ nếu chỉ cần mở rộng body/response tương thích.
- Handover/return tiếp tục dùng `borrow_histories`; repair evidence ban đầu dùng
  `asset_issues`.
- Damaged return vẫn phải giữ history update, issue creation và asset transition
  trong một business transaction nhất quán.

## 19. Open business decisions / explicitly deferred scope

Không còn business decision mở nào chặn architecture Phase 1 trong phạm vi đã
review. Các scope sau được defer rõ ràng:

- `AFTER_REPAIR` chỉ áp dụng cho successful Complete Repair. Evidence cho repair
  failed cần requirement/purpose riêng sau này.
- Filename gốc chỉ được bổ sung nếu UI/business cần hiển thị hoặc audit.
- Magic-byte validation, image decode/reprocess, antivirus và private media
  access model là phase/security scope riêng.
- Nếu evidence cần private, phải review CloudFront signed URL/private access;
  không thay đổi ngầm trong Phase 1.
- Custom CloudFront domain, Route 53, ACM, OIDC/STS, automated worker/cron và
  exact detach-grace tracking không thuộc MVP.
- Phase 3 tự review việc chuyển repair evidence sang `repair_records` nếu cần
  phân biệt nhiều repair attempt; Phase 1 không thiết kế trước abstraction đó.

Downstream phase boundaries:

- Phase 2 accessory checklist và handover/return evidence có thể cùng thuộc một
  `borrow_history`, nhưng không có FK checklist → evidence và Phase 2 không tự
  thêm media purpose mới.
- Phase 3 phải activation purpose/policy riêng nếu cần before-repair,
  repair-failed, invoice hoặc biên bản image; không tái sử dụng
  `AFTER_REPAIR` sai nghĩa.
- Phase 4 không tạo upload flow, không move/copy repair evidence và không reuse
  repair media làm handover evidence cho borrow request mới.

## 20. Implementation phases

Các bước này mô tả delivery sequence tương lai, không xác nhận đã implement:

1. Chuyển scope đã duyệt sang MVP requirement, user story, business rule,
   contract, frontend spec và acceptance criteria active.
2. Provision/verify S3 private bucket, CloudFront distribution, OAC, bucket
   policy, CORS, IAM user secret env và cost alert.
3. Thêm Prisma enums/models/migration cho `media_files`, typed evidence và
   nullable asset/user media FKs theo migration/backward-compatibility plan.
4. Thêm backend S3 adapter, purpose policy map, presign, complete, cancel, URL
   resolver và tests.
5. Mở rộng coordinating business services để claim/link media trong transaction
   hiện có cho handover, return và successful Complete Repair.
6. Mở rộng asset/user create/update/read theo hybrid media-FK/legacy-URL model.
7. Thêm reusable Vue uploader, local preview, retry/cancel và evidence display
   trong history/detail.
8. Thêm manual cleanup/audit commands và operations runbook.
9. Đồng bộ OpenAPI/API catalog/contracts trong implementation task và chạy đầy
   đủ backend, frontend, DB integration và AWS smoke verification.

## 21. Acceptance criteria

Phase 1 chỉ được coi là implemented khi:

- `media_files` chỉ có `PENDING/READY`, dùng `mediaId`, `purpose` và one-time
  atomic claim; không có polymorphic target/owner.
- Presign → PUT → complete hoạt động với private S3; frontend không có AWS
  credential và không dùng presigned GET.
- `HeadObject` verify existence/metadata đúng nghĩa; không tuyên bố kiểm MIME
  bytes thật.
- Direct S3 public read bị từ chối; CloudFront public URL đọc được qua OAC.
- Object key đúng prefix/UUID/MIME-derived extension, không chứa PII và không
  overwrite khi thay ảnh.
- Handover, normal return, damaged return và Complete Repair không evidence vẫn
  hoạt động như trước.
- Media đúng owner, purpose, status và count mới được claim; concurrent/repeated
  claim không reuse cùng media.
- Business mutation, media claim và typed evidence/FK link commit hoặc rollback
  cùng nhau.
- Borrow history detail trả handover/return evidence; asset issue detail trả
  successful repair evidence.
- Asset/user upload mới dùng media FK, legacy URL vẫn đọc được và không cần
  backfill.
- Frontend preview trước complete dùng local object URL; không cần ETag.
- Presign expiry, declared MIME/size validation, complete metadata mismatch,
  cancel, retry và idempotency có test.
- Manual cleanup dry-run/execute phân biệt stale `PENDING`, never-linked `READY`
  và detached replacement; relation/FK là current-reference source of truth và
  được lock/recheck chống race trước delete.
- `media:audit` phát hiện referenced missing object nhưng không tự sửa DB.
- IAM backend không có `ListBucket` trong DB-driven cleanup MVP; frontend không
  có upload/delete credential dài hạn.
- CloudFront cache policy hỗ trợ TTL một năm, key immutable và không forward
  query/cookie/header không cần thiết.
- Active requirements, migration, code, OpenAPI, API catalog, frontend spec,
  tests và runbook được đồng bộ trong implementation task.
