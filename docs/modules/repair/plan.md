# Plan — Repair

> Input: [`spec.md`](spec.md). Repair sở hữu `repair_logs`; Asset sở hữu status.

## 1. Phạm vi

- Danh sách/chi tiết repair logs.
- Bắt đầu sửa một asset `damaged`.
- Cập nhật thông tin log đang mở nếu spec cho phép.
- Hoàn tất với result `repaired|failed`, end date, cost và note.
- Phát event sau commit khi Event Bus sẵn sàng.

## 2. Kiến trúc và ownership

```text
Repair routes → RepairController → RepairService
                                  ├─ IRepairRepository
                                  ├─ AssetService
                                  ├─ User query boundary
                                  └─ PrismaClient.$transaction
```

- RepairRepository chỉ ghi `repair_logs`.
- AssetService thực hiện `damaged → in_repair` và
  `in_repair → available|damaged`.
- RepairService mở transaction và truyền cùng `tx`.

## 3. API contract đề xuất

| Method | Endpoint | Permission | Mục đích |
|---|---|---|---|
| GET | `/api/repair-logs` | `repair_log.view` | Danh sách/filter |
| GET | `/api/repair-logs/:id` | `repair_log.view` | Chi tiết |
| POST | `/api/repair-logs` | `repair_log.create` | Bắt đầu sửa |
| PATCH | `/api/repair-logs/:id` | `repair_log.update` | Cập nhật log mở |
| POST | `/api/repair-logs/:id/complete` | `repair_log.close` | Hoàn tất |

Không expose endpoint update asset status trực tiếp từ Repair.

## 4. DTO và data

- Start input: assetId, handledBy, startDate, optional note.
- Update input: các field cho phép của log đang mở.
- Complete input: endDate, non-negative cost, result, optional completion note.
- Prisma hiện có `repair_logs`; cần review index/constraint bảo đảm một log mở.
- Nếu database không thể unique condition `end_date IS NULL` trực tiếp, dùng
  conditional Asset transition + repository guard và integration test.

## 5. Transaction flows

### Start repair

1. Validate handler và input.
2. Mở transaction.
3. `AssetService.startRepair(assetId, tx)` conditional `damaged → in_repair`.
4. Tạo repair log mở.
5. Commit rồi publish `repair.started`.

### Complete repair

1. Conditional close log chỉ khi `end_date IS NULL`.
2. Validate endDate >= startDate và cost >= 0.
3. `AssetService.completeRepair(assetId, result, tx)`.
4. Commit rồi publish `repair.completed`.

## 6. Errors và security

- Mọi route cần `requireAuth` + `repair_log.*`.
- Handler/user và asset phải tồn tại.
- Asset không damaged hoặc đã có repair mở trả conflict.
- Complete log đã đóng trả conflict/idempotent behavior theo spec.
- Không lộ Prisma error hoặc user security fields.

## 7. Test strategy

- Unit: cost/date/result/handler và mapping trạng thái.
- Integration: start/complete cùng transaction, rollback, one-open-log rule.
- Concurrency: hai người start repair cùng asset chỉ một thành công.
- HTTP: permissions và invalid IDs.

## 8. Thứ tự triển khai

1. Review schema/constraint/index.
2. DTO/model + validation.
3. Repository contract/implementation.
4. Start repair vertical slice.
5. Complete repair.
6. Query/update log.
7. Controller/routes/permissions.
8. Tests.
9. Events sau commit.
10. Frontend Repair.

## 9. Không làm

- Không sửa Asset status trực tiếp trong RepairRepository.
- Không mở nhiều repair log cho một asset.
- Không complete nếu log đã đóng.
- Không mặc định result; người thực hiện phải chọn.
- Không gửi notification/email trong transaction.
