# 06 — Sửa chữa (Repair)

> Aggregate root: `repair_logs`. Phụ thuộc module 02 (Thiết bị) và 03 (Người dùng).
> Có vòng đời riêng (start/end/cost) nên là module, không phải bảng lookup.
>
> Loại tài liệu: **Spec** — mô tả WHAT/WHY, phạm vi và tiêu chí chấp nhận.
> Thiết kế triển khai nằm ở [`plan.md`](plan.md); trạng thái code nằm ở
> [`implementation.md`](implementation.md).

## 1. Goals
- Tạo log sửa chữa cho một thiết bị hỏng, gán người xử lý.
- Theo dõi thời gian bắt đầu/kết thúc và chi phí.
- Liên động trạng thái asset: bắt đầu sửa → `in_repair`; sửa xong → `available`/`damaged`.

## 2. Non-goals
- Không tự update bảng `assets` (phải gọi service module 02).
- Không xử lý mượn/trả (module 05).

## 3. Data model (Prisma, đã có)
- `repair_logs`: id, asset_id, handled_by (users), start_date, end_date (nullable),
  cost (Decimal 12,2, default 0), note (nullable).

## 4. Constraints
- Chỉ tạo repair_log cho asset đang `damaged`.
- Một asset chỉ có tối đa một repair log đang mở (`end_date = null`). Việc đổi
  `damaged -> in_repair` bằng conditional update cũng là guard chống tạo đồng thời.
- `handled_by` phải là user tồn tại.
- Đổi `assets.status` phải gọi service module 02.
- `cost` không âm.
- Bắt đầu/hoàn tất sửa dùng Prisma interactive transaction; `RepairRepository` và
  `AssetService` nhận cùng `tx: Prisma.TransactionClient`.
- Event được publish sau commit, không emit giữa transaction.

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0601: The system shall đảm bảo `cost` không âm.

### Event-driven
- REQ-0610: When bắt đầu sửa một asset đang `damaged`, the system shall trong một
  Prisma interactive transaction tạo `repair_logs` với `start_date`, gọi
  `AssetService.startRepair(assetId, tx)`, rồi publish `repair.started` sau commit.
- REQ-0611: When hoàn tất sửa (ghi `end_date`, `cost`, `result`), the system shall
  trong cùng Prisma interactive transaction gọi
  `AssetService.completeRepair(assetId, result, tx)`; result `repaired` đưa asset về
  `available`, result `failed` đưa asset về `damaged`, rồi publish
  `repair.completed` sau commit.

### Unwanted behavior
- REQ-0630: If tạo repair_log cho asset không ở trạng thái `damaged`, then the system shall từ chối.
- REQ-0631: If `handled_by` không tồn tại, then the system shall từ chối.
- REQ-0632: If `end_date` sớm hơn `start_date`, then the system shall từ chối.
- REQ-0633: If asset đã có repair log đang mở hoặc không còn ở trạng thái `damaged`
  khi bắt đầu sửa, then the system shall từ chối và rollback toàn bộ transaction.

## 6. Events emitted
- `repair.started` { repairLogId, assetId, handledBy }
- `repair.completed` { repairLogId, assetId, cost, result }

Đây là event contract mục tiêu; event bus/Notification chưa được triển khai hiện tại.

## 7. Câu hỏi mở
- [x] Một asset có được có nhiều repair_log mở (chưa end_date) cùng lúc không?
  => Không. Chỉ được có một log đang mở.
- [x] Sửa xong mặc định về `available` hay cần xác nhận thủ công?
  => Người hoàn tất phải chọn result `repaired` hoặc `failed`; không tự mặc định.
