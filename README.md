# training_SE

## Media storage roadmap

Roadmap future dùng một media foundation chung cho handover/return/repair
evidence, asset image và user avatar. Binary nằm ở private AWS S3; CloudFront là
public read layer:

```text
Vue → BigIn API xin presigned PUT → S3 private bucket
         ↓ complete/verify                 ↑
    media_files READY               CloudFront + OAC
         ↓                                ↓
    business link                  public GET/HEAD URL
```

S3 giữ Block Public Access. Frontend chỉ nhận presigned PUT có thời hạn; AWS
credential, complete/verify và delete thuộc backend. Public media URL được
derive từ `PUBLIC_MEDIA_BASE_URL + "/" + storage_path`; đây không phải
presigned GET. Asset/user upload mới dùng media FK, còn URL hiện có được giữ làm
legacy fallback.

Đây vẫn là `FUTURE / NOT IMPLEMENTED`. Public CloudFront media không đồng
nghĩa miễn phí hoặc private; storage, request, transfer, object health và budget
phải được theo dõi.

Chi tiết activation nằm trong
[Phase 0](docs/future/scale-phases/phase-0-activation.md), còn technical source
of truth nằm trong
[Phase 1](docs/future/scale-phases/phase-1-image-evidence-core.md).
