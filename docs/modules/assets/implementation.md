# Implementation — Asset Management

## 1. Trạng thái

**Backend core: đã triển khai.** Catalog CRUD, Asset CRUD và state-transition
boundary đã có. Automated tests và frontend wiring chưa hoàn chỉnh.

## 2. Thành phần đã triển khai

- Models: asset, asset model, asset type, brand.
- Repositories: contract + Prisma implementation cho cả bốn resource.
- Services/controllers/routes cho cả bốn resource.
- `AssetService` sở hữu retire và toàn bộ transition.
- `AssetRepository.transitionStatus` hỗ trợ conditional update và transaction.

## 3. API đang hoạt động

- `/api/brands`
- `/api/asset-types`
- `/api/asset-models`
- `/api/assets`
- `POST /api/assets/:id/report-damaged`

Tất cả được đăng ký trong `routes/index.ts` và bảo vệ bằng permission.

## 4. Data/migration thực tế

- Migration serial number nullable/unique.
- Migration bổ sung `reserved` và `retired`.
- Asset delete không xóa row; chuyển thành `retired`.

## 5. Kiểm thử hiện tại

- Có tài liệu Postman cho catalog CRUD.
- Chưa thấy test suite riêng cho AssetService, state machine hoặc DB concurrency.
- Typecheck/build là verification tối thiểu sau thay đổi backend.

## 6. Sai khác hoặc giới hạn

- Event `asset.status_changed` mới là contract mục tiêu, chưa publish vì Event Bus
  chưa triển khai.
- Một số frontend Asset view đã tồn tại nhưng chưa được đăng ký đầy đủ trong router,
  nên chưa xem là frontend module hoàn thành.

## 7. Phần còn thiếu

- Unit test service/state machine.
- Integration test unique/FK/conditional transition.
- Concurrency test hai đơn reserve cùng asset.
- Hoàn thiện và nối frontend Asset.
- Publish event sau commit khi event infrastructure được xây.
