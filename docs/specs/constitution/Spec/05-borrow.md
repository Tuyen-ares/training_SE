# 05 — Mượn / trả (Borrowing)

> Module phức tạp nhất: có state machine, liên động status asset, transaction đa bảng.
> Aggregate root: `borrow_requests`. Phụ thuộc module 02 (Thiết bị) và 03 (Người dùng).

## 1. Goals
- Người dùng tạo yêu cầu mượn gồm nhiều thiết bị, kèm ngày dự kiến trả.
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
- Chỉ mượn được asset đang `available` tại thời điểm duyệt.
- Việc đổi `assets.status` phải gọi service module 02, không update trực tiếp.
- Duyệt đơn là thao tác đa bảng → phải trong một transaction.

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0501: The system shall đảm bảo một asset chỉ xuất hiện một lần trong một đơn mượn.

### Event-driven
- REQ-0510: When người dùng tạo đơn mượn hợp lệ, the system shall tạo `borrow_requests` với `status=pending` cùng các `borrow_request_details`, và emit `borrow_request.created`.
- REQ-0511: When người có quyền duyệt một đơn đang `pending`, the system shall (trong một transaction) đặt `status=approved`, ghi `approved_by` và `approved_at`, gọi service module 02 để đổi mỗi asset sang `borrowed`, tạo `borrow_histories` với `borrow_date`, rồi emit `borrow_request.approved` SAU KHI commit.
- REQ-0512: When người có quyền từ chối một đơn đang `pending`, the system shall đặt `status=rejected`, ghi `approved_by`/`approved_at`/`note`, và emit `borrow_request.rejected`. Không đổi status asset.
- REQ-0513: When ghi nhận trả một thiết bị đã mượn, the system shall đặt `borrow_histories.return_date`, gọi service module 02 để đổi asset sang `available` (nếu tốt) hoặc `damaged` (nếu hỏng), và emit `asset.returned`.

### State-driven
- REQ-0520: While một đơn ở trạng thái `approved` hoặc `rejected`, the system shall từ chối mọi thao tác duyệt/từ chối tiếp theo lên đơn đó.

### Unwanted behavior
- REQ-0530: If duyệt một đơn không ở trạng thái `pending`, then the system shall từ chối (REQ-0520).
- REQ-0531: If tại thời điểm duyệt có bất kỳ asset nào không còn `available`, then the system shall hủy toàn bộ transaction duyệt và báo lỗi (không mượn được một phần).
- REQ-0532: If tạo đơn với asset không tồn tại, then the system shall từ chối.
- REQ-0533: If người từ chối không cung cấp `note` (nếu bắt buộc — xem câu hỏi mở), then the system shall từ chối thao tác.

## 6. Events emitted
- `borrow_request.created` { requestId, userId }
- `borrow_request.approved` { requestId, userId, approverId, assetIds }
- `borrow_request.rejected` { requestId, userId, approverId, note }
- `asset.returned` { detailId, assetId, userId, condition }

## 7. Câu hỏi mở
- [ ] Người tạo đơn có được tự hủy đơn `pending` không? (thêm transition pending→cancelled?)
- [ ] `note` khi từ chối có bắt buộc không?
- [ ] Có kiểm quá hạn trả (expected_return_date đã qua mà chưa trả) không? Nếu có, ai/thời điểm nào phát `overdue`?
- [ ] Một user có giới hạn số thiết bị đang mượn đồng thời không?
