# Phase 4 — Repair Handback theo Option A

**Status: FUTURE / NOT IMPLEMENTED**
**Phụ thuộc: Phase 3 đã ổn định và business đã xác nhận policy Option A**

## Mục tiêu

Giữ repair handback đơn giản, dễ hiểu và không làm mơ hồ lịch sử mượn.

## Policy đã chọn

```text
Repair Complete
→ asset AVAILABLE
→ employee tự tạo Borrow Request mới
```

## Hành vi phải bảo đảm

- Không tự giao lại cho borrower cũ.
- Không tái sử dụng borrow history cũ cho lần mượn mới.
- Không chuyển thẳng `AVAILABLE → BORROWED` ngoài approval/handover flow.
- Không thêm `WAITING_HANDBACK`.
- Không tạo queue handback hoặc notification handback trong phase này.
- Employee nhìn thấy hướng dẫn rằng muốn dùng lại asset phải tạo request mới.

## Backend implementation slices

1. Xác nhận `completeRepair` hiện tại trả asset về `AVAILABLE`.
2. Thêm regression/concurrency tests để ngăn auto-reassign hoặc reuse history.
3. Nếu cần thêm API/documentation, chỉ mô tả policy; không tạo mutation mới cho
   handback.

## Frontend implementation slices

- Hiển thị thông báo/hướng dẫn sau khi repair complete nếu màn hình hiện tại có
  liên quan đến employee hoặc repair operator.
- Link employee tới flow tạo Borrow Request mới nếu route hiện có hỗ trợ.
- Không hiển thị nút “Return to previous borrower” hoặc handback queue.

## Gate acceptance

Phase 4 đạt khi:

- Repair complete luôn kết thúc ở `AVAILABLE`.
- Request mới đi qua approval, reservation và handover như bình thường.
- Borrow history cũ vẫn chỉ phản ánh lần mượn cũ.
- Không có status, queue, notification hoặc mutation handback mới.
- Regression tests chứng minh không có auto-reassignment.

## Điều kiện mở lại thiết kế

Chỉ mở Option C nếu business sau này bắt buộc chứng minh employee đã nhận lại
asset. Khi đó phải tạo scope mới cho:

- Status/workflow chờ handback.
- Queue và permission.
- Notification.
- Employee acknowledgement bắt buộc.
- State transition và history semantics.

Không thêm các thành phần trên chỉ vì có file phase này.
