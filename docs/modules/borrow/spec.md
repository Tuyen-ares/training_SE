# 05 — Mượn / trả (Borrowing)

> Module phức tạp nhất: có state machine, liên động status asset, transaction đa bảng.
> Aggregate root: `borrow_requests`. Phụ thuộc module 02 (Thiết bị) và 03 (Người dùng).
>
> Loại tài liệu: **Spec** — mô tả WHAT/WHY, phạm vi và tiêu chí chấp nhận.
> Thiết kế triển khai nằm ở [`plan.md`](plan.md); trạng thái code nằm ở
> [`implementation.md`](implementation.md).

## 1. Goals

- Người dùng tạo yêu cầu mượn gồm nhiều thiết bị, kèm ngày dự kiến trả; các thiết bị
  được giữ ở trạng thái `reserved` trong thời gian đơn `pending`.
- Người có quyền duyệt hoặc từ chối yêu cầu.
- Khi duyệt: đánh dấu asset `borrowed` và tạo lịch sử mượn.
- Ghi nhận trả thiết bị và cập nhật lịch sử + trạng thái asset.

## 2. Non-goals

- Không tự update bảng `assets` (phải gọi service module 02).
- Không quản lý sửa chữa (module 06).

## 3. Data model (Prisma, đã có)

- `borrow_requests`: id, user_id, status (enum pending|approved|rejected),
  created_at, approved_by (nullable), approved_at (nullable), note.
- `borrow_request_details`: id, borrow_request_id, asset_id, expected_return_date;
  unique (borrow_request_id, asset_id).
- `borrow_histories`: id, borrow_request_detail_id (unique), borrow_date, return_date (nullable).

## 4. Constraints

- Một asset không xuất hiện 2 lần trong cùng một đơn (ràng buộc unique đã có).
- Chỉ duyệt/từ chối được đơn đang `pending`.
- Chỉ tạo được đơn khi tất cả asset đang `available`; tạo đơn thành công phải giữ
  toàn bộ asset bằng transition `available -> reserved`.
- Mỗi asset chỉ được thuộc tối đa một đơn `pending` tại một thời điểm.
- Việc đổi `assets.status` phải gọi service module 02, không update trực tiếp.
- `BorrowService` mở Prisma interactive transaction và truyền cùng
  `tx: Prisma.TransactionClient` cho `BorrowRepository`, `BorrowHistoryRepository`
  và `AssetService`, nên mọi query cùng commit hoặc rollback.
- `BorrowService` không import/gọi `AssetRepository`; nó chỉ gọi public method của
  `AssetService`. Luật transition vẫn do module 02 định nghĩa.
- Khi tạo đơn, mỗi `available -> reserved` phải là conditional update trong cùng
  transaction tạo request/details. Chỉ cần một asset không còn `available` thì toàn
  bộ transaction rollback và không tạo đơn.
- Khi duyệt, mỗi `reserved -> borrowed` phải là conditional update trong transaction.
  Chỉ cần một reservation không còn hợp lệ thì toàn bộ transaction rollback.
- `approvePending` cũng phải update có điều kiện `status = pending`; nếu không còn
  khớp thì báo conflict thay vì ghi đè lần duyệt/từ chối khác.
- Domain event được thu thập trong callback và chỉ publish sau khi Promise
  `prisma.$transaction(...)` resolve thành công.

Luồng triển khai đã chốt (mã minh họa, không phải Prisma code):

```ts
const events = await this.prisma.$transaction(async (tx) => {
  await borrowRepository.approvePending(requestId, approverId, tx);
  const assetEvents = await assetService.markBorrowed(assetIds, tx);
  await borrowHistoryRepository.createMany(detailIds, tx);
  return [...assetEvents, borrowRequestApprovedEvent];
});

for (const event of events) {
  await eventBus.publish(event); // target: chỉ chạy sau khi transaction đã commit
}
```

## 5. Acceptance Criteria (EARS)

### Ubiquitous

- REQ-0501: The system shall đảm bảo một asset chỉ xuất hiện một lần trong một đơn mượn.

### Event-driven

- REQ-0510: When người dùng tạo đơn mượn hợp lệ, the system shall trong một
  transaction gọi `AssetService.reserve(assetIds, tx)`, tạo `borrow_requests` với
  `status=pending` cùng các `borrow_request_details`, rồi publish
  `borrow_request.created` sau commit.
- REQ-0511: When người có quyền duyệt một đơn đang `pending`, the system shall dùng
  một Prisma interactive transaction để đặt `status=approved`, ghi
  `approved_by`/`approved_at`, gọi
  `AssetService.markBorrowed(assetIds, tx)` cho toàn bộ asset, tạo `borrow_histories`
  qua `BorrowHistoryRepository` với `borrow_date`, rồi publish
  `borrow_request.approved` SAU KHI commit.
- REQ-0512: When người có quyền từ chối một đơn đang `pending`, the system shall đặt
  `status=rejected`, ghi `approved_by`/`approved_at`/`note`, gọi
  `AssetService.releaseReservation(assetIds, tx)` để trả asset về `available`, rồi
  publish `borrow_request.rejected` sau khi transaction commit.
- REQ-0513: When ghi nhận trả một thiết bị đã mượn, the system shall trong cùng Prisma
  interactive transaction đặt `borrow_histories.return_date`, gọi
  `AssetService.returnAsset(assetId, condition, tx)` để đổi asset sang `available`
  (nếu tốt) hoặc `damaged` (nếu hỏng), rồi publish `asset.returned` sau commit.

### State-driven

- REQ-0520: While một đơn ở trạng thái `approved` hoặc `rejected`, the system shall từ chối mọi thao tác duyệt/từ chối tiếp theo lên đơn đó.

### Unwanted behavior

- REQ-0530: If duyệt một đơn không ở trạng thái `pending`, then the system shall từ chối (REQ-0520).
- REQ-0531: If tại thời điểm tạo đơn có bất kỳ asset nào không còn `available`, then
  the system shall hủy toàn bộ transaction và báo conflict; không tạo đơn một phần.
- REQ-0532: If tạo đơn với asset không tồn tại, then the system shall từ chối.
- REQ-0533: If người từ chối không cung cấp `note` (nếu bắt buộc — xem câu hỏi mở), then the system shall từ chối thao tác.
- REQ-0534: If hai người đồng thời tạo đơn cho cùng một asset, then conditional update
  `available -> reserved` shall chỉ cho một transaction thành công; transaction còn
  lại báo conflict và rollback.

## 6. Events emitted

- `borrow_request.created` { requestId, userId }
- `borrow_request.approved` { requestId, userId, approverId, assetIds }
- `borrow_request.rejected` { requestId, userId, approverId, note }
- `asset.returned` { detailId, assetId, userId, condition }

Đây là event contract mục tiêu. Event bus và Notification listener chưa được triển khai;
khi triển khai phải publish sau transaction theo luồng ở trên.

## 7. Câu hỏi mở

- [ ] Người tạo đơn có được tự hủy đơn `pending` không? (thêm transition pending→cancelled?)
=> có thể hủy nhưng không publish event, vì hủy là thao tác của người tạo đơn, không phải duyệt/từ chối.
- [ ] `note` khi từ chối có bắt buộc không?
=> Có thể bắt buộc, vì người duyệt cần giải thích lý do từ chối cho người tạo đơn.
- [ ] Có kiểm quá hạn trả (expected_return_date đã qua mà chưa trả) không? Nếu có, ai/thời điểm nào phát `overdue`?
=> 
- [ ] Một user có giới hạn số thiết bị đang mượn đồng thời không?
=> không giới hạn.