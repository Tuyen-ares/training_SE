# training_SE

## Image evidence storage roadmap

Image evidence trong roadmap future dùng AWS S3 làm private origin và
CloudFront làm public read layer:

```text
Vue → BigIn API xin presigned PUT → upload trực tiếp lên S3 private bucket
                                              ↓
                                     CloudFront + OAC → public GET/HEAD URL
```

Public media URL được tạo từ `PUBLIC_MEDIA_BASE_URL + storage_path`. Direct S3
URL không public; upload, xác nhận object và delete vẫn đi qua BigIn API. AWS
secret không bao giờ nằm ở frontend. S3 Block Public Access phải được giữ bật,
và AWS storage, request, CloudFront transfer cùng budget cần được theo dõi vì
public media không đồng nghĩa miễn phí vô hạn.

Chi tiết scope và gate nằm trong [Phase 0](docs/future/scale-phases/phase-0-activation.md)
và [Phase 1](docs/future/scale-phases/phase-1-image-evidence-core.md).
