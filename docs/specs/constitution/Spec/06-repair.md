# 06 — Sửa chữa (Repair)

> Aggregate root: `repair_logs`. Phụ thuộc module 02 (Thiết bị) và 03 (Người dùng).
> Có vòng đời riêng (start/end/cost) nên là module, không phải bảng lookup.

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
- `handled_by` phải là user tồn tại.
- Đổi `assets.status` phải gọi service module 02.
- `cost` không âm.

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0601: The system shall đảm bảo `cost` không âm.

### Event-driven
- REQ-0610: When bắt đầu sửa một asset đang `damaged`, the system shall tạo `repair_logs` với `start_date`, gọi service module 02 đổi asset sang `in_repair`, và emit `repair.started`.
- REQ-0611: When hoàn tất sửa (ghi `end_date`, `cost`), the system shall gọi service module 02 đổi asset sang `available` (sửa được) hoặc `damaged` (không sửa được), và emit `repair.completed`.

### Unwanted behavior
- REQ-0630: If tạo repair_log cho asset không ở trạng thái `damaged`, then the system shall từ chối.
- REQ-0631: If `handled_by` không tồn tại, then the system shall từ chối.
- REQ-0632: If `end_date` sớm hơn `start_date`, then the system shall từ chối.

## 6. Events emitted
- `repair.started` { repairLogId, assetId, handledBy }
- `repair.completed` { repairLogId, assetId, cost }

## 7. Câu hỏi mở
- [ ] Một asset có được có nhiều repair_log mở (chưa end_date) cùng lúc không? (nên chặn)
- [ ] Sửa xong mặc định về `available` hay cần xác nhận thủ công?
