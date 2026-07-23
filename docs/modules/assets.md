# 02 — Quản lý thiết bị (Asset Management)

> Aggregate root: `assets`. Bao gồm cả danh mục: asset_models, asset_types, brands.
> Là CHỦ SỞ HỮU DUY NHẤT của việc đổi `assets.status`.

## 1. Goals
- CRUD thiết bị (assets) và các danh mục liên quan (models, types, brands).
- Cung cấp service đổi trạng thái asset cho các module khác gọi (không cho update chéo).
- Cung cấp application service theo hành động nghiệp vụ: `markBorrowed`,
  `returnAsset`, `reportDamaged`, `startRepair`, `completeRepair`.
- Sinh/quản lý `qr_code` và `serial_number` duy nhất cho mỗi asset.

## 2. Non-goals
- Không xử lý mượn/trả (module 05) hay sửa chữa (module 06).
- Không tự quyết định khi nào đổi status — chỉ thực thi khi được gọi, sau khi guard duyệt.

## 3. Data model (Prisma, đã có)
- `assets`: id, asset_model_id, serial_number (unique, nullable), status
  (`available|reserved|borrowed|damaged|in_repair|retired`),
  qr_code (unique), created_at.
- `asset_models`: id, brand_id, asset_type_id, name; unique (brand_id, asset_type_id, name).
- `asset_types`: id, name (unique).
- `brands`: id, name (unique).

Schema đã bổ sung `reserved` và `retired` vào enum `assets_status`. Asset không
dùng `deleted_at`.

Kiểu dữ liệu nghiệp vụ:

```ts
type ReturnCondition = 'good' | 'damaged';
type RepairResult = 'repaired' | 'failed';
```

## 4. Constraints
- `qr_code` và `serial_number` phải duy nhất toàn hệ thống.
- Asset không bị xóa vật lý. Thao tác xóa/ngừng sử dụng chuyển status sang `retired`.
- Endpoint/action được bảo vệ bởi `asset.delete` nhưng semantics là retire, không phải
  SQL delete.
- Chỉ asset `available` hoặc `damaged` được chuyển sang `retired`; không retire asset
  đang `reserved`, `borrowed` hoặc `in_repair`.
- Một asset chuyển `available -> reserved` ngay khi được giữ thành công cho một đơn
  `pending`. Asset `reserved` không được đưa vào danh sách có thể chọn mượn.
- `retired` là trạng thái cuối và bị loại khỏi danh sách asset có thể mượn/vận hành;
  màn hình quản trị có thể lọc để xem tài sản đã ngừng sử dụng.
- `qr_code` và `serial_number` của asset retired không được tái sử dụng.
- Không xóa brand/type/model còn được asset tham chiếu.
- Public status service nhận `tx: Prisma.TransactionClient` từ caller đối với use case
  liên module; AssetService không tự mở transaction mới trong trường hợp đó.
- Mỗi transition update phải kèm trạng thái nguồn kỳ vọng để chống hai transaction
  cùng lấy một asset.
- Khi event bus được triển khai, transition trả pending event
  `asset.status_changed`; caller chỉ publish sau khi transaction commit.

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0201: The system shall đảm bảo `qr_code` là duy nhất khi tạo asset.
- REQ-0202: The system shall là nơi duy nhất được cập nhật `assets.status` trong toàn hệ thống.
- REQ-0203: The system shall không đưa asset `retired` vào danh sách asset có thể
  mượn, báo hỏng, bắt đầu sửa hoặc thực hiện nghiệp vụ vận hành khác.

### Event-driven (CRUD danh mục)
- REQ-0210: When admin tạo brand/type/model với tên trùng ràng buộc unique, the system shall từ chối và báo trùng.
- REQ-0211: When admin tạo asset, the system shall khởi tạo `status = available` và sinh `qr_code` duy nhất.

### Transition (service gọi bởi module khác — xem
[`system-overview.md`](../architecture/system-overview.md))
- REQ-0219: When được gọi `reserve(assetIds, tx)` để tạo đơn mượn và tất cả asset
  đang `available`, the system shall đổi toàn bộ sang `reserved`; nếu không giữ đủ
  số asset thì ném conflict để transaction tạo đơn rollback.
- REQ-0220: When được gọi `markBorrowed(assetIds, tx)` và tất cả asset đang
  `reserved`, the system shall đổi toàn bộ sang `borrowed`.
- REQ-0228: When được gọi `releaseReservation(assetIds, tx)` do đơn bị từ chối hoặc
  hủy và tất cả asset đang `reserved`, the system shall đổi toàn bộ sang `available`.
- REQ-0221: When được gọi `returnAsset(assetId, 'good', tx)` và asset đang
  `borrowed`, the system shall đổi status sang `available`.
- REQ-0222: When được gọi `returnAsset(assetId, 'damaged', tx)` và asset đang
  `borrowed`, the system shall đổi status sang `damaged`.
- REQ-0223: When được gọi `reportDamaged(assetId, tx)` và asset đang `available`,
  the system shall đổi status sang `damaged`.
- REQ-0224: When được gọi `startRepair(assetId, tx)` và asset đang `damaged`, the
  system shall đổi status sang `in_repair`.
- REQ-0225: When được gọi `completeRepair(assetId, 'repaired', tx)` và asset đang
  `in_repair`, the system shall đổi status sang `available`.
- REQ-0226: When được gọi `completeRepair(assetId, 'failed', tx)` và asset đang
  `in_repair`, the system shall đổi status sang `damaged`.
- REQ-0227: When admin ngừng sử dụng asset đang `available` hoặc `damaged`, the
  system shall đổi status sang `retired` thay vì xóa row.

### Unwanted behavior
- REQ-0230: If yêu cầu chuyển status không nằm trong bảng transition hợp lệ, then the system shall ném `InvalidStateTransitionError` và KHÔNG đổi status.
- REQ-0231: If xóa brand/type/model còn được tham chiếu, then the system shall từ chối.
- REQ-0232: If ngừng sử dụng asset đang `borrowed` hoặc `in_repair`, then the system shall từ chối.
- REQ-0233: If asset đang `retired`, then the system shall từ chối mọi transition
  nghiệp vụ tiếp theo và giữ nguyên các quan hệ lịch sử.
- REQ-0234: If transition update không còn khớp trạng thái nguồn kỳ vọng, then the
  system shall báo conflict và không ghi đè trạng thái mới hơn.
- REQ-0235: If `markBorrowed(assetIds, tx)` không đổi được đủ số asset yêu cầu, then
  the system shall ném conflict để transaction duyệt đơn rollback toàn bộ.

## 6. Events emitted
- `asset.status_changed` { assetId, from, to } — mỗi lần status đổi.

Event này là target cho giai đoạn event bus/Notification, chưa được triển khai hiện tại.

## 7. Quyết định đã chốt
- [x] `qr_code` do backend tự sinh bằng UUID khi tạo asset và không được cập nhật
  qua CRUD thông thường.
- [x] Xóa asset là xóa cứng hay soft-delete?
  => Không dùng hai cách trên. Chuyển `status` sang `retired`.
