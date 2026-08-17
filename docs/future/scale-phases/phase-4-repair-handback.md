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

## Boundary với media/evidence

- Phase 4 không sở hữu media upload, purpose, storage model hoặc endpoint mới.
- Repair evidence tiếp tục thuộc `asset_issues` hoặc `repair_records` theo
  ownership decision của Phase 3.
- Khi employee tạo Borrow Request mới, không move/copy repair evidence sang
  request/history mới và không reuse repair media làm `HANDOVER` evidence.
- Nếu handover mới cần ảnh, user upload media `HANDOVER` mới qua lifecycle Phase
  1; không overwrite hoặc đổi purpose của object cũ.
- Public CloudFront URL và metadata/history cũ không thay đổi chỉ vì asset trở
  lại `AVAILABLE`.

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
4. Không thêm media relink/copy logic vào complete-repair hoặc borrow-request
   flow.

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
- Repair evidence vẫn thuộc repair context cũ; request/handover mới chỉ nhận
  media mới đúng purpose nếu user upload.
- Không có status, queue, notification hoặc mutation handback mới.
- Regression tests chứng minh không có auto-reassignment.

## Điều kiện mở lại thiết kế

Chỉ mở Option C nếu business sau này bắt buộc chứng minh employee đã nhận lại
asset. Khi đó phải tạo scope mới cho:

- Status/workflow chờ handback.
- Queue và permission.
- Notification.
- Employee confirmation bắt buộc, nếu requirement mới chứng minh điều đó.
- State transition và history semantics.

Không thêm các thành phần trên chỉ vì có file phase này.

Nếu cần employee confirmation/acknowledgement, phải mở requirement custody riêng;
đó không phải scope của Phase 1 Image Evidence Core.
