# Plan — Asset Management

> Input: [`spec.md`](spec.md). Module sở hữu catalog và toàn bộ transition
> `assets.status`.

## 1. Phạm vi

- CRUD `brands`, `asset_types`, `asset_models`, `assets`.
- Chặn xóa lookup còn bị tham chiếu.
- Tạo asset ở trạng thái `available`, sinh QR duy nhất.
- Retire thay cho hard delete asset.
- Cung cấp các hành động trạng thái cho Borrow và Repair.

## 2. Kiến trúc và ownership

Mỗi resource CRUD đi theo:

```text
route → controller → service → repository contract → Prisma repository
```

Plain CRUD dùng base abstractions khi phù hợp. Các transition nghiệp vụ nằm trong
`AssetService`, không ép vào generic CRUD. Chỉ AssetRepository được update
`assets.status`; Borrow/Repair gọi public method của AssetService.

## 3. API contract

| Resource | Endpoints |
|---|---|
| Brands | CRUD `/api/brands` |
| Asset types | CRUD `/api/asset-types` |
| Asset models | CRUD `/api/asset-models` |
| Assets | CRUD `/api/assets`; delete mang nghĩa retire |
| Asset action | `POST /api/assets/:id/report-damaged` |

Các method `reserve`, `releaseReservation`, `markBorrowed`, `returnAsset`,
`startRepair`, `completeRepair` là application-service boundary cho module khác;
không bắt buộc mở route trực tiếp.

## 4. Data và migration

- Enum: `available|reserved|borrowed|damaged|in_repair|retired`.
- `serial_number` nullable nhưng unique khi có giá trị.
- `qr_code` unique và do server sinh.
- Composite unique của asset model giữ nguyên theo schema.
- Không thêm `deleted_at`; retire là trạng thái cuối.

## 5. Business flow và concurrency

- Tạo asset luôn ép `status=available`, bỏ qua status tùy ý từ client.
- Retire dùng conditional transition chỉ từ `available` hoặc `damaged`.
- Transition nhiều asset dùng `updateMany` theo `id IN (...) AND status=expected`.
- So sánh số row update với số ID duy nhất để phát hiện conflict.
- Borrow/Repair truyền cùng `Prisma.TransactionClient` xuống AssetService.
- Không dùng read-then-write làm guard cuối cùng cho hành động cạnh tranh.

## 6. Authorization, validation và errors

- Mọi route yêu cầu `requireAuth`.
- Permission theo registry của từng resource/action.
- ID phải là số nguyên dương.
- Duplicate name/serial/QR trả conflict có kiểm soát.
- FK không tồn tại và xóa lookup đang được tham chiếu trả lỗi nghiệp vụ, không lộ Prisma.
- Transition sai trả `InvalidStateTransitionError`.

## 7. Test strategy

- Unit service: duplicate, FK, retire, mỗi transition hợp lệ/không hợp lệ.
- Repository integration: conditional update và unique constraints.
- Concurrency: hai transaction reserve cùng asset chỉ một thành công.
- HTTP integration: permission, validation và response DTO.
- Manual Postman: CRUD bốn resource và report damaged.

## 8. Thứ tự triển khai

1. Catalog CRUD: Brand → Type → Model.
2. Asset CRUD và QR/serial.
3. Enum/migration `reserved`, `retired`.
4. Conditional transition repository.
5. Public AssetService actions.
6. Route permission và error mapping.
7. Automated tests.
8. Frontend catalog/list/detail/form.

## 9. Không làm

- Không xử lý borrow request/history trong Asset.
- Không tạo/đóng repair log trong Asset.
- Không cho client update `status` tùy ý.
- Không hard delete asset.
- Không phát notification trực tiếp; chỉ trả event cho hạ tầng publish sau commit.
