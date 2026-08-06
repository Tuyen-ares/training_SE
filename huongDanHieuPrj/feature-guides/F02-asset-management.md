# F02 – Asset Management

## Bức tranh nghiệp vụ

F02 cung cấp danh sách, chi tiết, lọc, CRUD asset, catalog, QR lookup và retire. User có `asset.view` đọc thông tin; action ghi cần permission riêng.

## Spec cần đọc trước

- [F02 feature](../../docs/mvp-requirements/06-features/F02-asset-management.md)
- [Asset User Stories](../../docs/mvp-requirements/07-user-stories/asset-management/)
- [Asset read/write contract](../../docs/contracts/asset-read-and-report-issue.md)
- [Prisma assets models](../../apps/backend/prisma/schema.prisma)

### Tóm tắt rule để đọc code

- `AVAILABLE`, `RESERVED`, `BORROWED`, `DAMAGED`, `IN_REPAIR`, `RETIRED` là trạng thái thật.
- Asset detail không tự cho xem identity borrower nếu thiếu capability history.
- QR là lookup asset, không tự biến thành inventory module.
- Retire chỉ cho trạng thái hợp lệ và không tự xảy ra sau repair failed.

## Minimum Reading Path

1. [AssetListView.vue](../../apps/frontend/src/views/assets/AssetListView.vue) – `load`, `applyFilters`, `clearFilters`.
2. [asset.service.js](../../apps/frontend/src/services/asset.service.js) – `listAssets`, `getAsset`, `createAsset`, `updateAsset`, `retireAsset`, `findAssetByQr`.
3. [asset.routes.ts](../../apps/backend/src/routes/asset.routes.ts).
4. [assets.service.ts](../../apps/backend/src/services/assets.service.ts) – `getReadPage`, `getReadDetail`, `create`, `update`, `retire`.
5. [asset-api.integration.test.ts](../../apps/backend/tests/asset-api.integration.test.ts).

## User Story/action chính

- `US-F02-01` – Xem danh sách asset.
- `US-F02-02` – Xem chi tiết asset.
- `US-F02-03` – Xem asset có thể mượn.
- `US-F02-04` – Tạo asset.
- `US-F02-05` – Cập nhật asset.
- `US-F02-06` – Quản lý catalog.
- `US-F02-07` – Ngừng sử dụng asset.
- `US-F02-08` – Tra cứu asset bằng QR.

## Trace từng action

| User Story/action | Đường trace đầy đủ | Đọc |
|---|---|---|
| `US-F02-01` Xem danh sách/lọc | `AssetListView:load/applyFilters/loadLookups` → `listAssets/listAssetLookups` → `GET /api/assets` + lookup API → `asset.routes.ts` permission `asset.view` → `AssetController.getAll` → `AssetService.getReadPage` → `PrismaAssetRepository` → Prisma `Asset/AssetModel/Brand/AssetType/Department` → DB `assets/asset_models/brands/asset_types/departments` → `asset-api.integration.test.ts` | KỸ: service query/status; LƯỚT: lookup mapping |
| `US-F02-02` Xem chi tiết | `AssetDetailView:loadAsset` → `getAsset` → `GET /api/assets/:id` → `asset.routes.ts` permission `asset.view` → `AssetController.getById` → `AssetService.getReadDetail` → `PrismaAssetRepository` → Prisma `Asset` + classification relations → DB `assets/asset_models/brands/asset_types/departments` → `asset-api.integration.test.ts` | KỸ: visibility/actions; LƯỚT: template |
| `US-F02-03` Xem asset có thể mượn | `BorrowRequestCreateView:loadAssets` hoặc list filter → `listAssets({status: AVAILABLE})` → `GET /api/assets?status=AVAILABLE` → `asset.routes.ts` permission `asset.view` → `AssetController.getAll` → `AssetService.getReadPage` → `PrismaAssetRepository` → Prisma `Asset.status` → DB `assets.status` → `asset-api.integration.test.ts` | KỸ: status filter; BỎ QUA: card style |
| `US-F02-04` Tạo asset | `AssetFormView:submit` → `createAsset` → `POST /api/assets` → `asset.routes.ts` permission `asset.create` → `AssetController.create` → `AssetService.create` → `PrismaAssetRepository` → Prisma `Asset` → DB `assets` → `asset.service.test.ts`, `asset-api.integration.test.ts` | KỸ: validation/default QR/status; LƯỚT: form rules |
| `US-F02-05` Cập nhật asset | `AssetFormView:load/submit` → `getAsset/updateAsset` → `GET/PATCH /api/assets/:id` → `asset.routes.ts` permission `asset.view`/`asset.update` → `AssetController.getById/update` → `AssetService.update` → `PrismaAssetRepository` → Prisma `Asset` → DB `assets` → `asset.service.test.ts` | KỸ: field ownership/status protection |
| `US-F02-06` Catalog | `AssetCatalogView:load/openDialog/saveDialog` → `listCatalog/createCatalogItem/updateCatalogItem` → `/brands`, `/asset-types`, `/asset-models` → catalog route permissions `*.view/create/update` → catalog controllers → `BrandService/AssetTypeService/AssetModelService` → `PrismaBrandRepository/PrismaAssetTypeRepository/PrismaAssetModelRepository` → Prisma `Brand/AssetType/AssetModel` → DB catalog tables → `asset-api.integration.test.ts` | LƯỚT: generic CRUD; KỸ: foreign keys |
| `US-F02-07` Retire | `AssetDetailView:confirmRetire` → `retireAsset` → `POST /api/assets/:id/retire` → `asset.routes.ts` permission `asset.delete` → `AssetController.retire` → `AssetService.retire` → `PrismaAssetRepository` → Prisma `Asset.status` → DB `assets.status` → `asset.service.test.ts` | KỸ: allowed states |
| `US-F02-08` QR lookup | `AssetListView:openQrCode` → `findAssetByQr` → `GET /api/assets/by-qr/:qrCode` → `asset.routes.ts` permission `asset.view` → `AssetController.getByQr` → `AssetService.getReadDetailByQr` → `PrismaAssetRepository` → Prisma `Asset.qrCode` → DB `assets.qr_code` → `asset-api.integration.test.ts` | LƯỚT: QR UI; KỸ: lookup/no mutation |

## SPEC EXPECTS

F02 có đọc, tạo/cập nhật, catalog, retire và QR lookup. Không có purchase lifecycle, inventory stocktake hoặc full asset-history module.

## CURRENT CODE

Các action trên có route, service và backend test. FE có `AssetListView`, `AssetDetailView`, `AssetFormView`, `AssetCatalogView`.

## GAPS

- Camera scan QR không phải scope; code chỉ lookup theo chuỗi QR.
- Không có delete catalog theo thiết kế hiện tại; evidence nằm trong asset API integration test.
