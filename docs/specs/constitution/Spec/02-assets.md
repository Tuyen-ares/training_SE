# 02 — Quản lý thiết bị (Asset Management)

> Aggregate root: `assets`. Bao gồm cả danh mục: asset_models, asset_types, brands.
> Là CHỦ SỞ HỮU DUY NHẤT của việc đổi `assets.status`.

## 1. Goals
- CRUD thiết bị (assets) và các danh mục liên quan (models, types, brands).
- Cung cấp service đổi trạng thái asset cho các module khác gọi (không cho update chéo).
- Sinh/quản lý `qr_code` và `serial_number` duy nhất cho mỗi asset.

## 2. Non-goals
- Không xử lý mượn/trả (module 05) hay sửa chữa (module 06).
- Không tự quyết định khi nào đổi status — chỉ thực thi khi được gọi, sau khi guard duyệt.

## 3. Data model (Prisma, đã có)
- `assets`: id, asset_model_id, serial_number (unique, nullable), status (enum),
  qr_code (unique), created_at.
- `asset_models`: id, brand_id, asset_type_id, name; unique (brand_id, asset_type_id, name).
- `asset_types`: id, name (unique).
- `brands`: id, name (unique).

## 4. Constraints
- `qr_code` và `serial_number` phải duy nhất toàn hệ thống.
- Không xóa cứng asset đang `borrowed` hoặc `in_repair`.
- Không xóa brand/type/model còn được asset tham chiếu.

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0201: The system shall đảm bảo `qr_code` là duy nhất khi tạo asset.
- REQ-0202: The system shall là nơi duy nhất được cập nhật `assets.status` trong toàn hệ thống.

### Event-driven (CRUD danh mục)
- REQ-0210: When admin tạo brand/type/model với tên trùng ràng buộc unique, the system shall từ chối và báo trùng.
- REQ-0211: When admin tạo asset, the system shall khởi tạo `status = available` và sinh `qr_code` duy nhất.

### Transition (service gọi bởi module khác — xem state machine ở 00-overview)
- REQ-0220: When được gọi markBorrowed(assetId) và asset đang `available`, the system shall đổi status sang `borrowed` và emit `asset.status_changed`.
- REQ-0221: When được gọi markReturned(assetId, condition) và asset đang `borrowed`, the system shall đổi status sang `available` (nếu tốt) hoặc `damaged` (nếu hỏng) và emit `asset.status_changed`.
- REQ-0222: When được gọi markInRepair(assetId) và asset đang `damaged`, the system shall đổi status sang `in_repair` và emit `asset.status_changed`.
- REQ-0223: When được gọi markAvailable(assetId) và asset đang `in_repair`, the system shall đổi status sang `available` và emit `asset.status_changed`.

### Unwanted behavior
- REQ-0230: If yêu cầu chuyển status không nằm trong bảng transition hợp lệ, then the system shall ném `InvalidStateTransitionError` và KHÔNG đổi status.
- REQ-0231: If xóa brand/type/model còn được tham chiếu, then the system shall từ chối.
- REQ-0232: If xóa asset đang `borrowed` hoặc `in_repair`, then the system shall từ chối.

## 6. Events emitted
- `asset.status_changed` { assetId, from, to } — mỗi lần status đổi.

## 7. Câu hỏi mở
- [ ] `qr_code` sinh tự động (UUID) hay nhập tay?
- [ ] Xóa asset là xóa cứng hay soft-delete?
