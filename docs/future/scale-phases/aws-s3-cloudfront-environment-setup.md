# AWS S3 + CloudFront — Environment Setup

**Status: FUTURE INFRA PREPARATION / NOT IMPLEMENTED**

Tài liệu này hướng dẫn chuẩn bị AWS infrastructure và environment variables
trước Phase 0 activation/Phase 1 implementation. Hoàn thành runbook không có
nghĩa media upload đã được implement trong BigIn.

Architecture được chuẩn bị:

```text
Frontend → BigIn API xin presigned PUT → private S3

Browser GET → public CloudFront → OAC → private S3
```

Không đưa AWS credential vào frontend. Không gửi access key/secret key qua chat,
commit, screenshot hoặc tài liệu.

## 1. Thông tin cần chuẩn bị

Các giá trị không phải secret có thể ghi lại trong password manager/runbook nội
bộ:

```text
AWS account ID
AWS region
S3 bucket name
CloudFront distribution ID
CloudFront distribution domain name
Frontend local origin
Frontend production origin
```

Các giá trị secret chỉ đặt trong local `.env` và Render secret environment:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

Không dùng root access key. MVP trên Render Free dùng IAM user access key;
platform hỗ trợ IAM role/task role thì ưu tiên role thay cho long-lived key.

## 2. S3 bucket baseline

S3 bucket phải:

- Nằm trong `AWS_REGION` được chọn.
- Giữ Block Public Access bật.
- Dùng Object Ownership `Bucket owner enforced`.
- Không dùng public ACL hoặc S3 website hosting.
- Không có bucket policy `Principal: "*"` cấp public `s3:GetObject`.

CloudFront OAC yêu cầu regular S3 bucket origin, không phải S3 website endpoint.
AWS khuyến nghị OAC và `Sign requests (recommended)` cho private S3 origin:
[AWS CloudFront OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).

## 3. IAM user cho BigIn backend

Tạo IAM user riêng cho BigIn backend, ví dụ `bigin-media-backend`. Không reuse
root credential hoặc credential của developer cá nhân.

MVP policy tối thiểu:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BigInMediaObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

Thay `YOUR_BUCKET_NAME` bằng tên bucket thật. Có thể scope tiếp xuống các prefix
đã chốt khi implementation ổn định.

Không cấp mặc định:

```text
s3:ListBucket
s3:PutObjectAcl
cloudfront:CreateInvalidation
cloudfront:UpdateDistribution
```

`HeadObject` dùng permission `s3:GetObject`. Khi IAM không có `s3:ListBucket`,
S3 có thể trả `403` thay vì `404` cho object không tồn tại; backend phải xử lý
đúng behavior này khi implementation:
[AWS HeadObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html).

Sau khi tạo access key, lưu ngay vào password manager và secret env. AWS chỉ cho
xem secret access key tại thời điểm tạo/rotate key.

## 4. S3 CORS cho direct browser PUT

S3 CORS phục vụ frontend PUT trực tiếp vào presigned S3 URL. `AllowedOrigins`
phải là frontend origin, không phải backend Render URL.

Baseline:

```json
[
  {
    "AllowedHeaders": [
      "Content-Type",
      "Cache-Control"
    ],
    "AllowedMethods": [
      "PUT"
    ],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://YOUR_FRONTEND_DOMAIN"
    ],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

Rules:

- Thay `YOUR_FRONTEND_DOMAIN` bằng origin thật, không có path hoặc trailing
  slash.
- Thêm các local origin khác chỉ khi frontend thực sự chạy ở port đó.
- Không cần expose `ETag`; frontend chỉ kiểm `response.ok`.
- Nếu implementation sau này ký thêm `x-amz-*` header, cập nhật
  `AllowedHeaders` đúng với signed headers trước khi test upload.

AWS yêu cầu header được browser gửi trong preflight phải match
`AllowedHeaders`: [AWS S3 CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html).

## 5. Tạo CloudFront distribution

Trong CloudFront Console, tạo standard distribution với cấu hình sau.

### Origin

```text
Origin domain: chọn regular S3 bucket
Origin path: để trống
Origin access: Origin access control settings (recommended)
OAC origin type: S3
Signing behavior: Sign requests (recommended) / always
```

Không chọn S3 website endpoint. Không cho viewer upload qua CloudFront.

### Default cache behavior

```text
Viewer protocol policy: Redirect HTTP to HTTPS
Allowed HTTP methods: GET, HEAD
Cache policy: CachingOptimized
Origin request policy: None
Response headers policy: None, trừ khi read flow sau này cần CORS riêng
Compress objects automatically: Yes
```

Managed policy `CachingOptimized` có Maximum TTL `31536000` giây, không đưa
cookie/query string vào cache key và phù hợp UUID immutable object key:
[AWS managed cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html).

### MVP settings khác

```text
Alternate domain name: để trống
Custom SSL certificate: không cần
Default root object: để trống
```

MVP dùng CloudFront default domain. Không cần Route 53/ACM/custom domain.

## 6. S3 bucket policy cho CloudFront OAC

Sau khi distribution có ID, thêm bucket policy read-only:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

Thay đúng ba placeholder:

```text
YOUR_BUCKET_NAME
YOUR_ACCOUNT_ID
YOUR_DISTRIBUTION_ID
```

Bucket policy chỉ cấp `s3:GetObject` cho CloudFront service principal trong
scope đúng distribution ARN. Backend IAM user nhận object permissions qua IAM
policy riêng; frontend không nhận bucket permission.

## 7. Backend environment variables

### Local development

Đặt trong `apps/backend/.env`. File này có thể chứa secret và không được commit:

```env
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=YOUR_BUCKET_NAME
AWS_ACCESS_KEY_ID=YOUR_IAM_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_IAM_SECRET_ACCESS_KEY

# Copy Distribution domain name sau khi distribution ở trạng thái Deployed.
# Có https:// và không có trailing slash.
PUBLIC_MEDIA_BASE_URL=https://dxxxxxxxxxxxxx.cloudfront.net

MEDIA_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp
MEDIA_MAX_IMAGE_SIZE_BYTES=10485760
MEDIA_MAX_EVIDENCE_IMAGE_COUNT=10
MEDIA_PRESIGNED_PUT_EXPIRES_SECONDS=300
```

Không thêm `VITE_` vào các biến AWS và không đặt chúng trong frontend `.env`.

### Render

Trong Render backend service, đặt cùng các key ở **Environment**. Đánh dấu
credential là secret và không paste chúng vào build log hoặc shell output.

Runtime BigIn không cần:

```env
CLOUDFRONT_DISTRIBUTION_ID=
CLOUDFRONT_OAC_ID=
S3_PUBLIC_URL=
```

Distribution ID và OAC ID chỉ dùng khi cấu hình AWS Console/bucket policy. MVP
không gọi CloudFront API hoặc invalidation; backend chỉ derive public URL:

```text
PUBLIC_MEDIA_BASE_URL + "/" + storage_path
```

## 8. Thứ tự điền env

1. Tạo/kiểm tra S3 bucket để biết `AWS_REGION` và `AWS_S3_BUCKET_NAME`.
2. Tạo IAM access key rồi đặt credential vào local/Render secret env.
3. Tạo CloudFront distribution + OAC và bucket policy.
4. Chờ distribution chuyển sang `Deployed`.
5. Copy `Distribution domain name`, thêm `https://`, không thêm trailing slash,
   rồi đặt `PUBLIC_MEDIA_BASE_URL`.
6. Không cần gửi credential thật cho người implement. Chỉ cần xác nhận các key
   đã tồn tại và cung cấp non-secret region/bucket/domain khi cần debug config.

Nếu chưa có CloudFront domain, để `PUBLIC_MEDIA_BASE_URL` trống; không dùng S3
URL làm giá trị tạm vì sẽ che mất lỗi architecture.

## 9. Infrastructure verification

Trước Phase 0 activation, xác nhận:

- CloudFront distribution status là `Deployed`.
- OAC gắn đúng S3 origin và signing behavior là `always`.
- Block Public Access vẫn bật và bucket không có public ACL/policy.
- Direct S3 object URL trả `AccessDenied`/`403`.
- Cùng object path qua CloudFront trả `200`.
- CloudFront response giữ object `Cache-Control` sau khi Phase 1 upload object
  với `public,max-age=31536000,immutable`.
- Frontend origin thực hiện được S3 CORS preflight khi presigned upload được
  implement.
- Không có AWS credential trong frontend bundle, Git hoặc documentation.
- AWS budget/cost alert có owner.

Có thể kiểm tra CloudFront object sau khi đã có test object:

```powershell
curl.exe -I "https://dxxxxxxxxxxxxx.cloudfront.net/path/to/test-object.jpg"
```

Direct S3 denial và CloudFront success mới chứng minh private-origin/public-CDN
boundary hoạt động đúng. Hiện repository chưa implement presigned upload nên
không dùng runbook này để kết luận application flow đã hoàn tất.

## 10. Troubleshooting nhanh

### CloudFront trả 403

Kiểm tra:

- Distribution đã `Deployed` chưa.
- Origin có phải regular S3 bucket không.
- OAC có gắn đúng origin và `Sign requests` không.
- Bucket policy có đúng account ID, distribution ID và bucket ARN không.
- Object key có đúng cả prefix và chữ hoa/thường không.

### Browser PUT bị CORS

Kiểm tra:

- `AllowedOrigins` có đúng frontend origin, protocol và port không.
- `AllowedHeaders` có chứa tất cả headers trong presigned response không.
- Frontend có gửi đúng `Content-Type` và `Cache-Control` đã ký không.
- Presigned URL còn hạn không.

### CloudFront URL bị ghép sai

Giá trị đúng:

```env
PUBLIC_MEDIA_BASE_URL=https://dxxxxxxxxxxxxx.cloudfront.net
```

Không dùng:

```env
PUBLIC_MEDIA_BASE_URL=https://dxxxxxxxxxxxxx.cloudfront.net/
PUBLIC_MEDIA_BASE_URL=https://YOUR_BUCKET.s3.amazonaws.com
```

## 11. Completion checklist

- [ ] S3 bucket private, Block Public Access bật, Bucket owner enforced.
- [ ] IAM backend chỉ có `PutObject/GetObject/DeleteObject` trong scope cần.
- [ ] S3 CORS có local và production frontend origins.
- [ ] CloudFront distribution dùng regular S3 origin.
- [ ] OAC dùng signing behavior `always`.
- [ ] Bucket policy scope đúng distribution ARN.
- [ ] CloudFront behavior chỉ public `GET/HEAD`.
- [ ] `PUBLIC_MEDIA_BASE_URL` dùng default CloudFront domain, không trailing
      slash.
- [ ] Local và Render backend env đã điền; frontend không có AWS credential.
- [ ] Direct S3 read bị từ chối; CloudFront read thành công.
- [ ] Budget/cost alert đã có owner.

