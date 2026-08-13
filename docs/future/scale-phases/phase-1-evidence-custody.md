# Phase 1 — Evidence & Custody Core

**Status: FUTURE / NOT IMPLEMENTED**
**Phụ thuộc: Phase 0 đã đạt activation gate**

## Mục tiêu

Ghi nhận tình trạng asset lúc giao và lúc trả, kèm image evidence tùy chọn và
acknowledgement của employee, mà không phá lifecycle MVP hiện tại.

## Phạm vi

### Custody record

- Tách record nghiệp vụ cho handover và return khỏi lifecycle summary hiện tại.
- Lưu condition detail, note, actor và timestamp.
- Cho phép liên kết record với `borrow_history` hiện tại.
- Không tạo status mới chỉ để biểu diễn inspection.

### Evidence

- Chỉ hỗ trợ image trong phase đầu.
- Evidence là optional; handover/return vẫn hoàn tất nếu không có image.
- Binary lưu ngoài MariaDB qua storage adapter.
- Database chỉ lưu metadata, object key/reference, actor và timestamp.
- URL đọc phải qua access control; không dùng public URL mặc định.

### Acknowledgement

- Employee đã authenticated có thể bấm xác nhận đã nhận/trả.
- Lưu actor và timestamp.
- Không bắt buộc acknowledgement để đóng giao dịch.
- Dữ liệu MVP cũ được coi là legacy/no evidence, không tạo record giả.

## State transition phải giữ nguyên

```text
RESERVED → BORROWED
BORROWED → AVAILABLE       (normal return)
BORROWED → DAMAGED         (damaged return)
```

> Với damaged return, history update, issue creation và asset transition vẫn phải
> là một business transaction nhất quán như MVP.

## Backend implementation slices

1. Thêm model/repository cho custody record và shared evidence metadata theo
   schema đã được chốt ở Phase 0.
2. Mở rộng handover/return service với payload inspection optional.
3. Tạo upload/read/delete-or-revoke behavior theo storage design; không để object
   orphan hoặc metadata mồ côi không được theo dõi.
4. Bảo vệ read/write bằng permission hiện có và ownership/related-custody check.
5. Giữ API cũ tương thích khi client không gửi inspection/evidence.

## Frontend implementation slices

- Inspection form/modal trong màn Handover & Return.
- Upload image, preview, remove/retry và mutation loading theo từng dòng.
- Hiển thị actor, timestamp, condition và note.
- Nút acknowledgement cho employee khi user có quyền và đúng custody.
- Loading, empty, API error, retry và responsive layout.
- Không request endpoint nếu user không có permission tương ứng.

## Test matrix

- Handover/return không có evidence vẫn thành công.
- MIME, kích thước và số lượng image không hợp lệ bị từ chối.
- User ngoài custody không đọc hoặc thay đổi evidence.
- Upload thành công nhưng transaction thất bại không làm lifecycle chuyển nửa
  chừng; object orphan có đường cleanup/retry rõ ràng.
- Handover/return lặp lại hoặc concurrent không tạo record/lifecycle transition
  thứ hai.
- API MVP cũ vẫn hoạt động.
- Damaged return vẫn atomic.
- Frontend kiểm tra duplicate click, retry, permission-only tabs và mobile.

## Gate acceptance

Phase 1 đạt khi:

- Có thể xem condition/evidence của một lần giao và trả đúng quyền.
- Không có binary trong MariaDB và không có public access ngoài ý muốn.
- Evidence optional không làm thay đổi behavior MVP.
- Lifecycle và acknowledgement có actor/timestamp đúng.
- Integration, security, concurrency và frontend verification đều pass.
- Có runbook xử lý failed upload/orphan object.

## Không làm trong phase này

- Không hỗ trợ video.
- Không làm checklist phụ kiện đầy đủ.
- Không làm receipt/PDF.
- Không thêm `WAITING_HANDBACK`.
- Không tạo immutable audit log hoàn chỉnh.
