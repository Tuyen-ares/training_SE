# Phase 1.1 — Lambda Media Processing

## Trạng thái

- Mục tiêu: giữ ảnh gốc Full HD/4K và tự động tạo bản display tối ưu cùng
  thumbnail WebP.
- Phạm vi: thiết kế triển khai cho media đã có trong Phase 1.
- Trạng thái code: chưa triển khai.
- Trạng thái AWS: chưa tạo hoặc thay đổi resource.
- Tài liệu này là source of truth để triển khai sau khi được review.

## 1. Mục tiêu người dùng

Người dùng upload ảnh trong các flow asset, avatar, handover, return hoặc
repair. Hệ thống phải:

1. Giữ nguyên file gốc trong S3.
2. Tạo một bản display nhẹ hơn để hiển thị trong giao diện.
3. Tạo một thumbnail nhỏ cho list, card và history.
4. Dùng bản nhẹ trong hoạt động bình thường.
5. Cho phép mở ảnh gốc khi phóng to hoặc tải xuống.
6. Không cho business operation claim media trước khi các bản xử lý cần thiết
   đã sẵn sàng.

### Ý nghĩa của ba URL

| URL | Mục đích | Nơi sử dụng |
| --- | --- | --- |
| publicUrl | Bản display WebP tối ưu | ảnh chính trong detail/gallery |
| thumbnailUrl | Bản nhỏ, tải nhanh | list, card, bảng lịch sử |
| originalUrl | File gốc Full HD/4K | preview phóng to, download, kiểm tra chi tiết |

publicUrl vẫn được giữ để tương thích với API media hiện tại. Sau Phase 1.1,
publicUrl có nghĩa là URL của bản display tối ưu đối với media mới.

Tất cả URL đọc ảnh đều là URL CloudFront. Frontend không nhận URL S3 trực tiếp,
AWS credential hoặc presigned GET URL.

## 2. Phạm vi và ngoài phạm vi

### Trong phạm vi

- S3 lưu object gốc immutable.
- S3 event notification cho object gốc.
- SQS queue và dead-letter queue.
- Lambda xử lý ảnh bằng thư viện sharp.
- Tạo display WebP và thumbnail WebP.
- Xoay ảnh theo EXIF orientation.
- Giữ aspect ratio và không upscale ảnh nhỏ.
- Ghi Content-Type và Cache-Control cho object dẫn xuất.
- Trạng thái xử lý trong database.
- Backend xác minh output trước khi đánh dấu media sẵn sàng.
- Frontend polling trạng thái xử lý.
- Read resolver ưu tiên thumbnail/display/original theo ngữ cảnh.
- Fallback cho media cũ chưa có variant.
- Smoke test, retry, DLQ và rollback.

### Ngoài phạm vi

- Virus scan.
- Moderation hoặc nhận diện nội dung.
- Xóa ảnh gốc sau khi tạo bản tối ưu.
- Presigned GET.
- Public S3 bucket.
- Lambda@Edge hoặc CloudFront Function để resize tại edge.
- Multipart upload.
- S3 versioning hoặc Object Lock.
- Video processing.
- OCR.
- Cleanup orphan bằng Lambda trong cùng phase.

Cleanup media vẫn là trách nhiệm backend command hoặc scheduler riêng. Lambda
trong tài liệu này chỉ xử lý media derivative.

## 3. Baseline Phase 1 hiện tại

Phase 1 hiện có:

- media_files.storage_path chứa một object path.
- Object gốc được upload trực tiếp từ browser vào S3 bằng presigned PUT.
- Backend ký Content-Type, Cache-Control và If-None-Match: *.
- POST /api/media/:mediaId/complete gọi HeadObject.
- upload_status chỉ có PENDING và READY.
- linked_at là one-time claim marker.
- Business linking chỉ claim media READY.
- CloudFront là public read layer qua OAC.
- API hiện tại trả một publicUrl.
- Frontend uploader hoàn tất sau một lần complete thành công.

Phase 1.1 phải mở rộng các điểm này. Không được cho business linking dùng media
chỉ vì object gốc tồn tại nếu derivative bắt buộc chưa được tạo.

## 4. Kiến trúc được chọn

### Luồng tổng quát

    Frontend Vercel
        │
        │ 1. POST /api/media/presign
        ▼
    Backend Render
        │
        │ 2. tạo media PENDING + presigned PUT
        ▼
    S3 private / originals/
        │
        │ 3. browser PUT ảnh gốc
        │ 4. S3 ObjectCreated notification
        ▼
    SQS media-image-processing
        │
        │ 5. Lambda event source mapping
        ▼
    AWS Lambda + sharp
        │
        ├── derived/.../display.webp
        └── derived/.../thumbnail.webp
                 │
                 │ 6. callback có chữ ký tới Backend Render
                 ▼
    Backend Render
        │
        │ 7. HeadObject output + transaction ghi variants
        │ 8. processing_status = READY
        ▼
    Frontend polling
        │
        │ 9. nhận URL và gửi mediaId vào business request
        ▼
    CloudFront
        ├── thumbnailUrl
        ├── publicUrl
        └── originalUrl

### Vì sao dùng S3 → SQS → Lambda

S3 có thể gọi trực tiếp Lambda, nhưng pipeline qua SQS được chọn cho bản hoàn
chỉnh vì:

- Có retry khi Lambda timeout hoặc lỗi tạm thời.
- Có DLQ để không mất event lỗi.
- Có thể giới hạn concurrency để bảo vệ chi phí và Lambda.
- Có thể replay message sau khi sửa lỗi.
- Không làm browser hoặc backend phải chờ xử lý ảnh trong cùng request.

S3, SQS và Lambda phải ở cùng AWS Region:

    ap-southeast-1

## 5. S3 object layout

Không cần tạo folder vật lý trong S3. Đây chỉ là prefix của object key.

### Object gốc

Object mới được presign dưới prefix originals/:

    originals/evidence/handover/YYYY/MM/<uuid>.<ext>
    originals/evidence/return/YYYY/MM/<uuid>.<ext>
    originals/evidence/repair/YYYY/MM/<uuid>.<ext>
    originals/asset-images/<uuid>.<ext>
    originals/user-avatars/<uuid>.<ext>

Ví dụ:

    originals/evidence/handover/2026/08/0d6...abc.png

Key không chứa email, tên user, asset code, serial number hoặc description.
UUID chỉ là định danh object, không phải security boundary.

### Object display

    derived/evidence/handover/YYYY/MM/<uuid>/display.webp
    derived/evidence/return/YYYY/MM/<uuid>/display.webp
    derived/evidence/repair/YYYY/MM/<uuid>/display.webp
    derived/asset-images/<uuid>/display.webp
    derived/user-avatars/<uuid>/display.webp

### Object thumbnail

    derived/evidence/handover/YYYY/MM/<uuid>/thumbnail.webp
    derived/evidence/return/YYYY/MM/<uuid>/thumbnail.webp
    derived/evidence/repair/YYYY/MM/<uuid>/thumbnail.webp
    derived/asset-images/<uuid>/thumbnail.webp
    derived/user-avatars/<uuid>/thumbnail.webp

Lambda chỉ nhận event có prefix originals/. Output nằm dưới derived/, vì vậy
output không kích hoạt lại chính Lambda.

## 6. Quy tắc xử lý ảnh

### Display variant

Mặc định:

    max width: 1920 px
    max height: 1920 px
    format: WebP
    quality: 84
    withoutEnlargement: true
    preserve aspect ratio: true

1920 px là giới hạn hiển thị, không phải giới hạn ảnh gốc. Ảnh gốc 4K vẫn
được giữ nguyên.

### Thumbnail variant

Mặc định:

    max width: 320 px
    max height: 320 px
    format: WebP
    quality: 80
    withoutEnlargement: true
    preserve aspect ratio: true

Thumbnail không crop ảnh trong MVP. Nếu sau này cần thumbnail vuông, thêm một
variant crop riêng thay vì thay đổi ý nghĩa thumbnail hiện tại.

### Metadata và orientation

Lambda phải:

- gọi rotate() để áp dụng EXIF orientation;
- không copy GPS/EXIF không cần thiết sang output;
- giữ alpha channel khi input có transparency;
- ghi Content-Type: image/webp;
- ghi Cache-Control: public,max-age=31536000,immutable;
- không thay đổi object gốc;
- không log nội dung ảnh, presigned URL hoặc secret.

## 7. Database design

### Giữ nguyên thông tin object gốc

media_files.storage_path tiếp tục là path của object gốc. Không đổi tên field
để tránh phá read model hiện tại.

Thêm:

    media_files.processing_status
    media_files.processed_at
    media_files.processing_error_code (nullable, sanitized)

upload_status và processing_status có ý nghĩa khác nhau:

| Field | Ý nghĩa |
| --- | --- |
| upload_status | object gốc đã upload và verify chưa |
| processing_status | display và thumbnail đã tạo, verify và lưu chưa |

### Enum đề xuất

Giữ nguyên:

    upload_status:
    PENDING
    READY

Thêm:

    processing_status:
    PENDING
    PROCESSING
    READY
    FAILED

Không dùng processing_status thay cho upload_status. Tách hai state giúp phân
biệt browser upload thất bại với Lambda xử lý thất bại.

### Bảng variants

Khuyến nghị dùng bảng riêng thay vì thêm nhiều column cố định vào media_files:

    media_variants
    -------------------------
    id
    media_file_id FK media_files.id
    variant_kind DISPLAY | THUMBNAIL
    storage_path UNIQUE
    mime_type
    size_bytes
    width
    height
    created_at

Constraint:

    UNIQUE(media_file_id, variant_kind)

Lợi ích:

- Không phải thêm column mới cho từng kích thước sau này.
- Có thể thêm SMALL hoặc MEDIUM mà không đổi media row.
- Retry Lambda có thể upsert idempotently theo media_file_id và variant_kind.

### Điều kiện claim mới

claimReady phải yêu cầu đồng thời:

    upload_status = READY
    processing_status = READY
    linked_at IS NULL
    uploaded_by = currentUser
    purpose = expectedPurpose

Nếu derivative chưa sẵn sàng, media không được dùng cho handover, return,
repair, asset image hoặc avatar.

### Backfill dữ liệu cũ

Không backfill binary tự động trong migration.

Migration chỉ backfill trạng thái metadata:

    media upload_status = READY
    → processing_status = READY

Media cũ chưa có row trong media_variants vẫn đọc object gốc qua fallback.
Media cũ PENDING vẫn giữ processing_status = PENDING.

Điều này bảo đảm:

- migration không tải toàn bộ object cũ;
- không tạo derivative giả;
- không làm history cũ mất ảnh;
- không bắt buộc reprocess toàn bộ bucket trong lúc deploy.

Nếu cần tối ưu toàn bộ dữ liệu cũ, tạo job reprocess riêng sau khi Phase 1.1
ổn định. Job đó phải có dry-run, batch, retry và không xóa object gốc.

## 8. API contract

### Presign

    POST /api/media/presign

Request giữ nguyên:

    {
      "purpose": "HANDOVER",
      "mimeType": "image/jpeg",
      "sizeBytes": 234567
    }

Thay đổi nội bộ:

- key mới nằm dưới originals/;
- presigned PUT vẫn ký Content-Type;
- vẫn ký Cache-Control;
- vẫn ký If-None-Match: *;
- không trả publicUrl trước khi processing hoàn tất.

### Complete

    POST /api/media/:mediaId/complete

Complete thực hiện:

1. Xác thực uploader.
2. Verify object gốc bằng HeadObject.
3. So sánh chính xác ContentLength, ContentType và CacheControl.
4. Chuyển upload_status từ PENDING sang READY.
5. Nếu variants đã tồn tại và verify được thì chuyển processing sang READY.
6. Nếu chưa có variants thì trả trạng thái PROCESSING.

Response khi đang xử lý:

    {
      "data": {
        "mediaId": 10,
        "uploadStatus": "READY",
        "processingStatus": "PROCESSING",
        "publicUrl": null,
        "thumbnailUrl": null,
        "originalUrl": "https://dxxxx.cloudfront.net/originals/..."
      }
    }

Response khi hoàn tất:

    {
      "data": {
        "mediaId": 10,
        "uploadStatus": "READY",
        "processingStatus": "READY",
        "mimeType": "image/jpeg",
        "sizeBytes": 234567,
        "purpose": "HANDOVER",
        "uploadedAt": "2026-08-18T10:04:00.000Z",
        "publicUrl": "https://dxxxx.cloudfront.net/derived/.../display.webp",
        "thumbnailUrl": "https://dxxxx.cloudfront.net/derived/.../thumbnail.webp",
        "originalUrl": "https://dxxxx.cloudfront.net/originals/..."
      }
    }

Một lần gọi complete khác phải idempotent:

- upload gốc đã READY thì không PUT lại;
- variants đã READY thì trả canonical response;
- processing chưa xong thì trả trạng thái hiện tại;
- không tạo media row mới chỉ vì Lambda đang xử lý.

### Status endpoint

Thêm endpoint:

    GET /api/media/:mediaId/status

Endpoint chỉ cho uploader hiện tại hoặc actor có quyền vận hành phù hợp đọc
trạng thái processing. Frontend dùng endpoint này để polling khi complete trả
PROCESSING.

Response tối thiểu:

    {
      "data": {
        "mediaId": 10,
        "uploadStatus": "READY",
        "processingStatus": "PROCESSING",
        "publicUrl": null,
        "thumbnailUrl": null,
        "originalUrl": "https://dxxxx.cloudfront.net/originals/..."
      }
    }

### Internal processing callback

Lambda không truy cập trực tiếp database Render. Sau khi tạo và verify output,
Lambda gọi endpoint nội bộ:

    POST /internal/media/process-complete

Payload không chứa PII:

    {
      "originalStoragePath": "originals/evidence/handover/2026/08/uuid.png",
      "variants": [
        {
          "kind": "DISPLAY",
          "storagePath": "derived/evidence/handover/2026/08/uuid/display.webp",
          "mimeType": "image/webp",
          "sizeBytes": 34567,
          "width": 1600,
          "height": 1200
        },
        {
          "kind": "THUMBNAIL",
          "storagePath": "derived/evidence/handover/2026/08/uuid/thumbnail.webp",
          "mimeType": "image/webp",
          "sizeBytes": 4567,
          "width": 320,
          "height": 240
        }
      ]
    }

Backend phải:

1. Verify HMAC/shared secret.
2. Tìm media row theo originalStoragePath.
3. Gọi HeadObject cho từng output.
4. Verify output path nằm dưới derived/.
5. Verify ContentType, kích thước và metadata.
6. Upsert media_variants.
7. Chuyển processing_status sang READY.
8. Commit tất cả database changes trong transaction.

Callback phải idempotent. Event S3 có thể giao trùng; callback lặp lại không
được tạo duplicate variant hoặc làm sai state.

Nếu expose route này thành API chính thức, phải cập nhật openapi.yaml,
docs/contracts/api-catalog.md và docs/contracts/media-evidence.md.

## 9. AWS setup checklist

### 9.1 S3 bucket

- [ ] Bucket ở ap-southeast-1.
- [ ] Block Public Access bật.
- [ ] Object Ownership: Bucket owner enforced.
- [ ] Không bật S3 website endpoint.
- [ ] CloudFront regular S3 origin.
- [ ] OAC signing behavior: always.
- [ ] CloudFront behavior chỉ GET và HEAD.
- [ ] Cache policy không forward query string/cookie/header không cần thiết.
- [ ] originals/* và derived/* đều được CloudFront đọc qua OAC.
- [ ] Bucket policy không mở public s3:GetObject.
- [ ] S3 CORS vẫn allowlist các origin frontend và PUT.
- [ ] CORS vẫn cho phép Content-Type, Cache-Control, If-None-Match.
- [ ] Không cần ExposeHeaders: ETag.

### 9.2 SQS queue

Tạo hai queue:

    media-image-processing
    media-image-processing-dlq

Thiết lập:

- [ ] Main queue có redrive policy tới DLQ.
- [ ] Visibility timeout lớn hơn thời gian Lambda tối đa đủ để tránh xử lý
  trùng khi Lambda chưa kết thúc.
- [ ] Message retention đủ để vận hành retry/replay.
- [ ] Queue và S3 cùng region.
- [ ] Queue policy chỉ cho bucket đã định danh gửi SendMessage.

Queue policy mẫu, thay placeholder bằng giá trị thật trong AWS:

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowMediaBucketToPublish",
          "Effect": "Allow",
          "Principal": {
            "Service": "s3.amazonaws.com"
          },
          "Action": "sqs:SendMessage",
          "Resource": "arn:aws:sqs:ap-southeast-1:<ACCOUNT_ID>:media-image-processing",
          "Condition": {
            "ArnEquals": {
              "aws:SourceArn": "arn:aws:s3:::<BUCKET_NAME>"
            },
            "StringEquals": {
              "aws:SourceAccount": "<ACCOUNT_ID>"
            }
          }
        }
      ]
    }

### 9.3 S3 event notification

Tạo event notification:

    Name: media-original-created
    Event: s3:ObjectCreated:*
    Prefix filter: originals/
    Destination: SQS media-image-processing

Không tạo notification cho derived/.

Nếu bucket đang có notification khác, phải kiểm tra filter overlap. Không để
hai notification cùng gửi một object vào các pipeline xử lý ngoài ý muốn.

### 9.4 Lambda execution role

Trust relationship:

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "lambda.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }

Identity policy tối thiểu:

    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "ReadOriginals",
          "Effect": "Allow",
          "Action": ["s3:GetObject"],
          "Resource": "arn:aws:s3:::<BUCKET_NAME>/originals/*"
        },
        {
          "Sid": "WriteDerived",
          "Effect": "Allow",
          "Action": ["s3:PutObject"],
          "Resource": "arn:aws:s3:::<BUCKET_NAME>/derived/*"
        },
        {
          "Sid": "ConsumeImageQueue",
          "Effect": "Allow",
          "Action": [
            "sqs:ReceiveMessage",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes"
          ],
          "Resource": "arn:aws:sqs:ap-southeast-1:<ACCOUNT_ID>:media-image-processing"
        },
        {
          "Sid": "WriteLambdaLogs",
          "Effect": "Allow",
          "Action": [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          "Resource": "arn:aws:logs:ap-southeast-1:<ACCOUNT_ID>:*"
        },
        {
          "Sid": "ReadProcessingSecret",
          "Effect": "Allow",
          "Action": ["secretsmanager:GetSecretValue"],
          "Resource": "arn:aws:secretsmanager:ap-southeast-1:<ACCOUNT_ID>:secret:<SECRET_NAME>-*"
        }
      ]
    }

Lambda không cần:

    s3:ListBucket
    s3:DeleteObject trên originals/*
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY

Nếu callback secret được cung cấp bằng encrypted environment variable thay vì
Secrets Manager, bỏ quyền secretsmanager:GetSecretValue và vẫn không ghi secret
ra log.

### 9.5 Lambda function

Thiết lập đề xuất:

    Function name: bigin-media-processor
    Region: ap-southeast-1
    Runtime: Node.js 22 hoặc runtime Node.js được AWS hỗ trợ
    Memory: bắt đầu từ 1024 MB
    Timeout: bắt đầu từ 60 giây
    Ephemeral storage: 1024 MB nếu ảnh lớn
    Architecture: nhất quán với sharp package

Không đặt Lambda vào VPC nếu không cần. Lambda cần gọi HTTPS tới Render
callback; để Lambda ngoài VPC giúp có outbound internet sẵn và không phải thêm
NAT Gateway.

Environment variables/config:

    MEDIA_BUCKET=<bucket>
    ORIGINAL_PREFIX=originals/
    DERIVED_PREFIX=derived/
    DISPLAY_MAX_WIDTH=1920
    DISPLAY_MAX_HEIGHT=1920
    DISPLAY_WEBP_QUALITY=84
    THUMBNAIL_MAX_WIDTH=320
    THUMBNAIL_MAX_HEIGHT=320
    THUMBNAIL_WEBP_QUALITY=80
    PROCESSING_CALLBACK_URL=https://<render-backend>/internal/media/process-complete
    PROCESSING_CALLBACK_SECRET=<read from Secrets Manager, not committed>

AWS_REGION và credential được lấy từ Lambda runtime/IAM role, không hard-code.

### 9.6 SQS event source mapping

- [ ] Gắn media-image-processing vào Lambda.
- [ ] Batch size bắt đầu là 1 để dễ quan sát và tránh memory spike.
- [ ] Bật partial batch response nếu handler hỗ trợ.
- [ ] Giới hạn reserved concurrency để bảo vệ chi phí và S3.
- [ ] Cấu hình retry và DLQ.
- [ ] Bật CloudWatch metrics cho Errors, Duration, Throttles, queue age và
  DLQ message count.

### 9.7 CloudFront

Không cần tạo distribution mới.

- [ ] Origin vẫn là regular S3 origin.
- [ ] OAC signing always.
- [ ] Behavior cho GET/HEAD.
- [ ] Cache-Control output là immutable.
- [ ] Không invalidation khi tạo derivative vì key có UUID.
- [ ] CloudFront URL được tạo từ PUBLIC_MEDIA_BASE_URL và encoded object path.

## 10. Lambda source package

Lambda là một deployable worker riêng, không đặt vào
apps/backend/src/commands. Command là CLI chạy thủ công; Lambda là event
handler có lifecycle, IAM role, retry và DLQ riêng.

Cấu trúc đề xuất:

    apps/media-processor/
    ├── src/
    │   ├── handler.ts
    │   ├── image-processor.ts
    │   ├── object-key.ts
    │   ├── s3-client.ts
    │   ├── queue-event.ts
    │   └── processing-callback.ts
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile
    └── README.md

Infrastructure config nên tách riêng:

    infra/aws/media-processing/
    ├── template.yaml hoặc cloudformation.yaml
    ├── iam-lambda-policy.json
    ├── sqs-policy.json
    └── README.md

### Handler responsibilities

handler.ts:

1. Nhận SQS event.
2. Parse S3 bucket/key.
3. Decode URL-encoded key.
4. Bỏ qua key không bắt đầu bằng originals/.
5. Xác định output key deterministic.
6. Download object gốc bằng stream/buffer phù hợp.
7. Gọi image processor để tạo hai output.
8. Put output với metadata đúng.
9. Gọi backend callback có signature.
10. Trả success chỉ khi cả output và callback thành công.

### Idempotency

S3/SQS event có thể giao nhiều lần. Cùng một object gốc phải luôn tạo cùng
output key:

    same original key
    → same display key
    → same thumbnail key

Retry không được tạo thêm variant row. Backend dùng upsert theo media_file_id
và variant_kind.

Nếu output đã tồn tại, Lambda có thể HeadObject rồi dùng lại nếu metadata đúng,
hoặc ghi lại cùng deterministic key nếu policy cho phép. Không ghi output đè
lên object gốc.

### Deploy package

sharp chứa native dependency. Ưu tiên Lambda container image:

    AWS Lambda Node.js base image
    → npm install sharp
    → build TypeScript
    → push image lên ECR
    → Lambda chạy từ ECR image

Nếu dùng ZIP, phải build dependency đúng Linux runtime/architecture của Lambda.
Không zip node_modules được build chỉ trên Windows rồi giả định sẽ chạy đúng.

## 11. Backend source changes

### Prisma

Sửa:

    apps/backend/prisma/schema.prisma

Thêm enum processing, field processing vào media_files, model media_variants,
index/unique constraint và migration forward-compatible.

Không sửa generated Prisma output bằng tay.

### Model/repository

Mở rộng:

- MediaFileRecord.
- MediaCompleteResponseDto.
- MediaEvidenceDto.
- repository findStatus.
- repository markProcessing.
- repository markProcessingFailed.
- repository upsert variant.
- repository transaction hoàn tất derivative.
- claimReady thêm điều kiện processing ready.

### Storage adapter

Bổ sung low-level operations cần cho server-side verification:

- HeadObject original.
- HeadObject display.
- HeadObject thumbnail.
- Put/Delete chỉ khi use case được phép.

Storage adapter không tự quyết định business semantics. Callback service mới
quyết định media nào được mark processing ready.

### Media service

Media service chịu trách nhiệm:

- Presign path dưới originals/.
- Complete original.
- Poll/complete processing.
- Canonical URL cho original/display/thumbnail.
- Reject claim khi processing chưa ready.
- Fallback read cho media cũ chưa có variants.

Không để controller tự sửa processing_status.

### Internal callback service

Tạo use case riêng:

    routes
    → internal controller
    → media processing callback service
    → media repository + storage adapter

Callback service phải:

- xác minh signature;
- reject replay quá cũ nếu dùng timestamp;
- validate payload;
- verify object path;
- HeadObject output;
- upsert variants và mark ready trong transaction;
- trả lỗi an toàn, không trả AWS detail.

### API documentation

Nếu triển khai route/status mới, phải cập nhật đồng bộ:

    apps/backend/openapi.yaml
    docs/contracts/api-catalog.md
    docs/contracts/media-evidence.md

Tài liệu phải nêu permission, ownership, PROCESSING response, retry/poll
semantics, FAILED behavior, response URL semantics, error codes và internal
callback boundary.

## 12. Frontend source changes

### Upload flow

    choose file
    → validate MIME/size
    → POST presign
    → PUT original vào S3
    → POST complete
    → nếu PROCESSING: polling status
    → READY: nhận thumbnail/display/original URL
    → gửi mediaId vào business request

Frontend không upload display hoặc thumbnail riêng. Lambda là nơi duy nhất tạo
derivative.

### UI states

    Uploading…
    Processing image…
    Ready
    Retry processing
    Failed

Không dùng percentage progress vì browser không theo dõi phần xử lý Lambda.

Nếu polling timeout:

- giữ mediaId;
- không PUT lại object gốc;
- cho phép retry status/complete;
- chỉ presign key mới khi xác định upload gốc thất bại và media cũ được
  cancel/stale cleanup.

### Hiển thị

- List/card dùng thumbnailUrl.
- Detail/gallery dùng publicUrl.
- Click preview dùng originalUrl.
- Preview local vẫn dùng URL.createObjectURL.
- Không render CloudFront URL trước khi complete/processing ready.
- Nếu media cũ không có variants, dùng original fallback.

## 13. Render, Vercel và environment

### Render backend

Giữ các biến AWS hiện có cho backend presign/HeadObject/DeleteObject.

Thêm nếu dùng callback:

    MEDIA_PROCESSING_CALLBACK_SECRET=<secret>
    MEDIA_ORIGINAL_PREFIX=originals/
    MEDIA_DERIVED_PREFIX=derived/
    MEDIA_PROCESSING_ENABLED=true

Secret callback phải được set ở Render và AWS Secrets Manager. Không commit vào
.env.example với giá trị thật.

### AWS Lambda

Lambda dùng IAM execution role, không dùng AWS access key. Lambda chỉ giữ config
non-secret trong environment và đọc callback secret từ Secrets Manager.

### Vercel

Vercel không cần AWS credential và không cần biết Lambda tồn tại. Chỉ cần
VITE_API_BASE_URL trỏ tới backend Render như hiện tại.

## 14. Retry và failure semantics

### Browser PUT thất bại

    PENDING original
    → best-effort cancel
    → presign media/key mới

Không reuse key cũ.

### PUT thành công, complete tạm thời thất bại

    giữ mediaId
    → retry complete/status cùng mediaId

Không PUT lại cùng key.

### Lambda event trùng

    same original key
    → deterministic output keys
    → idempotent upsert variants

Không tạo object gốc mới hoặc variant row trùng.

### Lambda timeout hoặc S3 5xx

- SQS giữ message để retry.
- Lambda không báo success khi chưa tạo đủ output.
- Sau giới hạn retry, message vào DLQ.
- Original object vẫn được giữ.
- Media không được claim khi processing chưa ready.

### Callback backend thất bại

- Lambda báo lỗi để SQS retry.
- Callback phải idempotent.
- Không đánh dấu READY cục bộ ở Lambda.
- Không cần Lambda truy cập database.

### Ảnh hỏng hoặc input không giải mã được

- Ghi sanitized error code.
- Mark processing_status = FAILED qua callback failure hoặc operational handler.
- Giữ original để điều tra/retry.
- Không public derivative không hợp lệ.

### Một output tạo thành công, output còn lại thất bại

- Không mark processing ready.
- Retry cùng event.
- Có thể ghi đè deterministic derived key hoặc verify dùng lại output cũ.
- Chỉ callback thành công cho cả hai variant mới chuyển READY.

## 15. Security boundary

- S3 vẫn private.
- Browser chỉ có presigned PUT của object gốc.
- Browser không có quyền Put/Delete derivative.
- Lambda role chỉ đọc originals/* và ghi derived/*.
- Không cấp ListBucket.
- Không log URL có chữ ký.
- Không lưu AWS credential trong Lambda source, Vercel hoặc browser.
- Callback dùng HMAC/shared secret, timestamp và body validation.
- Object key không chứa PII.
- CloudFront là read layer duy nhất.
- Original public qua CloudFront theo quyết định Phase 1. Nếu sau này evidence
  cần per-user authorization, phải redesign read access riêng.

## 16. Chi phí và vận hành

Các thành phần có thể phát sinh chi phí:

- S3 storage cho original và derived.
- S3 PUT/GET/HEAD request.
- SQS request và message retention.
- Lambda invocation/runtime.
- CloudWatch Logs.
- CloudFront transfer/cache.
- ECR storage nếu dùng container image.

Tối ưu:

- Không tải ảnh qua Render.
- Lambda xử lý theo event, không chạy liên tục.
- Giới hạn concurrency.
- Dùng thumbnail cho list.
- Dùng display WebP cho detail.
- Giữ immutable cache.
- Không invalidation vì key immutable.
- Có retention policy cho CloudWatch Logs.
- DLQ chỉ giữ message lỗi, không giữ vô hạn.

Lambda media processing không làm Render phải xử lý binary ảnh. Render chỉ xử
lý callback, HeadObject metadata và transaction database.

## 17. Observability

Lambda log được:

    event id
    original key hash hoặc sanitized key
    media lookup result
    processing duration
    input byte size
    display byte size
    thumbnail byte size
    success/failure code

Không log:

- presigned URL;
- callback secret;
- AWS credential;
- nội dung file;
- thông tin PII không cần thiết.

CloudWatch alarms:

- Lambda errors tăng.
- Lambda throttles.
- Duration gần timeout.
- SQS queue age tăng.
- DLQ có message.
- Callback HTTP 4xx/5xx tăng.

Backend metrics/log sanitized:

- media processing pending count;
- processing failed count;
- callback rejected count;
- variant metadata mismatch;
- claim rejected vì processing chưa ready.

## 18. Verification matrix

### AWS infrastructure

- [ ] S3 private.
- [ ] Direct S3 GET trả 403.
- [ ] CloudFront original GET thành công.
- [ ] CORS browser PUT original thành công.
- [ ] S3 notification chỉ bắt originals/.
- [ ] Derived object không tạo event quay lại Lambda.
- [ ] SQS nhận đúng event.
- [ ] Lambda role không có ListBucket.
- [ ] Lambda đọc được original.
- [ ] Lambda ghi được derived.
- [ ] Lambda không xóa original.
- [ ] SQS retry hoạt động.
- [ ] DLQ nhận message sau retry thất bại.

### Processing

- [ ] JPEG tạo display WebP và thumbnail WebP.
- [ ] PNG transparency được giữ.
- [ ] WebP input tạo output đúng.
- [ ] EXIF orientation được áp dụng.
- [ ] Ảnh nhỏ không bị upscale.
- [ ] Ảnh lớn bị giới hạn display theo config.
- [ ] Aspect ratio được giữ.
- [ ] Content-Type output là image/webp.
- [ ] Cache-Control output là immutable.
- [ ] Output path nằm dưới derived/.
- [ ] Output không overwrite original.

### Database/API

- [ ] Original verify thành công nhưng derivative chưa xong → processing.
- [ ] Media processing chưa ready → claim bị reject.
- [ ] Hai derivative sẵn sàng → status READY.
- [ ] Callback lặp lại không tạo duplicate variant.
- [ ] Callback sai signature bị reject.
- [ ] Callback sai original path bị reject.
- [ ] Callback output metadata mismatch không mark READY.
- [ ] Complete retry sau Lambda success trả canonical URLs.
- [ ] Media READY complete retry idempotent.
- [ ] Media cũ không có variants vẫn đọc được original.
- [ ] Legacy imageUrl/avatarUrl vẫn fallback đúng.

### Frontend

- [ ] Upload dùng presigned PUT với required headers cũ.
- [ ] UI hiển thị Uploading…
- [ ] UI hiển thị Processing image…
- [ ] Card dùng thumbnail.
- [ ] Detail dùng display WebP.
- [ ] Click preview dùng original URL.
- [ ] Polling không tạo PUT mới.
- [ ] Processing timeout giữ mediaId để retry.
- [ ] Không có AWS credential trong Vercel bundle.

### Business linking

- [ ] Handover chỉ claim media processing READY.
- [ ] Return chỉ claim media processing READY.
- [ ] Repair chỉ claim media processing READY.
- [ ] Asset image chỉ claim media processing READY.
- [ ] Avatar chỉ claim media processing READY.
- [ ] Claim và business mutation vẫn atomic.
- [ ] Rollback transaction không để linked_at hoặc relation một phần.

## 19. Deployment order

    1. Review và cập nhật active contracts
    2. Tạo S3 prefixes/policy và SQS/DLQ
    3. Tạo IAM role cho Lambda
    4. Tạo ECR repository hoặc Lambda package strategy
    5. Deploy Lambda ở disabled/low-concurrency mode
    6. Tạo S3 notification vào SQS
    7. Tạo event source mapping
    8. Apply Prisma migration forward-compatible
    9. Deploy backend hỗ trợ processing status/variants/callback
    10. Deploy frontend polling và URL selection
    11. Enable processing cho upload mới
    12. Chạy AWS smoke test
    13. Theo dõi queue, DLQ, callback và claim errors
    14. Nếu ổn định, cân nhắc reprocess media cũ theo batch

Backend hỗ trợ schema/API trước khi bật event processing cho production. Không
bật S3 notification khi backend chưa hiểu output hoặc chưa có migration tương
ứng.

## 20. Rollback

Nếu Lambda lỗi:

1. Disable event source mapping hoặc S3 notification.
2. Giữ nguyên original objects.
3. Không xóa derived objects đang tồn tại.
4. Giữ media rows và trạng thái để retry.
5. Rollback backend/frontend code nếu cần.
6. Giữ migration vì migration không xóa legacy fields hoặc original object.
7. Dùng feature flag để tạm ngừng upload mới hoặc chuyển fallback theo chính
   sách đã được phê duyệt.

Không rollback bằng cách xóa bucket, xóa original, reset database hoặc
destructive migration.

## 21. Required implementation checklist

### Documentation

- [ ] Cập nhật docs/contracts/media-evidence.md.
- [ ] Cập nhật docs/contracts/api-catalog.md.
- [ ] Cập nhật apps/backend/openapi.yaml.
- [ ] Cập nhật frontend media flow specification.
- [ ] Ghi decision về publicUrl, thumbnailUrl, originalUrl.
- [ ] Ghi processing status và retry semantics.

### Backend

- [ ] Prisma schema và migration.
- [ ] Variant repository/model/service.
- [ ] Complete/status behavior.
- [ ] Internal callback authentication.
- [ ] Claim condition processing READY.
- [ ] Read resolver display/thumbnail/original.
- [ ] Existing media fallback.
- [ ] Unit/service verification.

### Lambda

- [ ] Package riêng.
- [ ] sharp build đúng Lambda runtime.
- [ ] Handler idempotent.
- [ ] S3 stream/get/put.
- [ ] Callback signature.
- [ ] Structured sanitized logs.
- [ ] Container image hoặc ZIP build reproducible.

### AWS

- [ ] S3 event.
- [ ] SQS/DLQ.
- [ ] IAM least privilege.
- [ ] Lambda event source mapping.
- [ ] CloudWatch alarm.
- [ ] ECR nếu dùng container image.
- [ ] No browser/AWS credentials.

### Frontend

- [ ] Poll processing status.
- [ ] Dùng thumbnail/display/original đúng ngữ cảnh.
- [ ] Xử lý timeout/failure/retry.
- [ ] Không PUT lại khi chỉ processing đang chậm.

## 22. Acceptance criteria

Phase 1.1 được xem là hoàn tất khi:

1. Ảnh gốc vẫn tồn tại và không bị overwrite.
2. Lambda tạo được display WebP và thumbnail WebP.
3. S3 event không loop trên derived object.
4. Retry/DLQ xử lý được event lỗi.
5. Backend chỉ cho claim khi original và variants đều ready.
6. publicUrl, thumbnailUrl, originalUrl đúng semantics.
7. Giao diện list/detail dùng bản nhẹ.
8. Phóng to/tải xuống vẫn dùng ảnh gốc.
9. Media cũ vẫn đọc được bằng fallback.
10. Direct S3 read vẫn bị từ chối.
11. CloudFront read hoạt động cho cả original và derived.
12. Không có secret trong source, Vercel bundle hoặc logs.
13. Rollback giữ được original và không làm mất dữ liệu legacy.

