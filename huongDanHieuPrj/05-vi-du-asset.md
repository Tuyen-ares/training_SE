# 05. Ví dụ trace Asset

## Requirement liên quan

- [US-F02-01 – Xem danh sách](../docs/mvp-requirements/07-user-stories/asset-management/US-F02-01-view-assets.md)
- [US-F02-02 – Xem chi tiết](../docs/mvp-requirements/07-user-stories/asset-management/US-F02-02-view-asset-detail.md)
- [US-F02-04 – Tạo asset](../docs/mvp-requirements/07-user-stories/asset-management/US-F02-04-create-asset.md)
- [F02 Asset Management](../docs/mvp-requirements/06-features/F02-asset-management.md)

## Asset List

```text
AssetListView.vue
→ asset.service.js
→ GET /api/assets
→ asset.routes.ts
→ asset.controller.ts
→ assets.service.ts
→ asset.repository.ts
→ assets + asset_models + brands + asset_types + departments
```

## Asset Detail

Khi bấm `View details`, hãy kiểm tra:

- URL có chứa asset id không?
- Frontend gọi `GET /api/assets/:id` không?
- Backend có kiểm tra `asset.view` không?
- Có trả model, brand/type, department, image và status không?
- Có vô tình trả current borrower identity khi user không có quyền không?

## Tạo asset

```text
AssetFormView.vue
→ asset.service.js
→ POST /api/assets
→ asset route/controller/service/repository
→ assets
```

Khi đọc, chú ý asset status ban đầu, QR được server tạo hay frontend gửi lên, department và các foreign key của model.

## Trạng thái cần nhớ

```text
AVAILABLE → RESERVED → BORROWED → AVAILABLE
                    ↘ DAMAGED → IN_REPAIR → AVAILABLE
```

Không tự suy diễn trạng thái từ màu trên UI. Hãy kiểm tra business rule và response API.

