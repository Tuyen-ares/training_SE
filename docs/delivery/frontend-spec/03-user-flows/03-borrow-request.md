# FLOW-04 – Tạo phiếu mượn

## Goal

Gửi một yêu cầu gồm một hoặc nhiều asset AVAILABLE.

## Actor

Nhân viên.

## Related User Stories

`US-F03-01`, `US-F02-03`.

## Preconditions

User đã đăng nhập; có ít nhất một asset `AVAILABLE` để chọn.

## Main Flow

1. User mở `SCR-F03-01` và chọn một hoặc nhiều asset trong Asset List selection mode.
2. User nhập Borrowing Purpose không rỗng và expected return date hợp lệ cho từng detail theo form được chốt.
3. User gửi phiếu.
4. Hệ thống tạo header và các detail `PENDING`.
5. User được đưa tới My Borrow Requests hoặc Request Detail mới tạo.

## Alternative Flows

- Nhiều user có thể gửi request PENDING cho cùng asset còn AVAILABLE.

## Error / Invalid States

- Không có asset, Borrowing Purpose rỗng, asset trùng trong phiếu, expected return date không hợp lệ hoặc asset không còn AVAILABLE: không tạo dữ liệu sai; hiển thị validation phù hợp.

## Result

Phiếu được tạo; asset vẫn AVAILABLE cho tới khi một detail được duyệt.

## Related Screens

`SCR-F02-01`, `SCR-F03-01`, `SCR-F03-02`, `SCR-F03-03`.

# FLOW-05 – Xem phiếu và từng detail của tôi

## Goal

Theo dõi trạng thái tổng và trạng thái từng asset trong phiếu.

## Actor

Nhân viên.

## Related User Stories

`US-F03-02`, `US-F03-03`.

## Preconditions

User đã đăng nhập.

## Main Flow

1. User mở `SCR-F03-02`.
2. Hệ thống chỉ hiển thị phiếu do user hiện tại tạo, kèm mã, ngày tạo, trạng thái tổng.
3. User mở `SCR-F03-03`.
4. Hệ thống hiển thị mọi detail, expected return date, approval status và rejection reason khi có.

## Alternative Flows

- Notification liên quan mở đúng Request Detail nếu user còn quyền xem.

## Error / Invalid States

- User không sở hữu phiếu và không có permission xem phạm vi phù hợp: forbidden.

## Result

User biết detail nào PENDING, APPROVED hoặc REJECTED mà không suy ra bàn giao từ approval status.

## Related Screens

`SCR-F03-02`, `SCR-F03-03`, `SCR-F07-01`, `SCR-SYS-02`.

## Asset identity presentation

`SCR-F03-01` lấy danh sách available asset từ `GET /assets`, trong đó
`assetCode` đã có trong response. Audit frontend hiện tại ghi nhận hai formatter
khác nhau: option selector dùng `model.name · (serialNumber || qrCode)`; asset
đã chọn dùng `model + brand + (serialNumber || "Not assigned")` và chưa hiển
thị Code. Implementation phải thay cả hai bằng canonical normalizer/formatter:
Model, Code và SN theo cùng thứ tự, thiếu value hiển thị `—`, tuyệt đối không
fallback sang QR. Selection id, validation, expected return date và submit
payload không thay đổi.

Request Detail dùng cùng identity contract cho từng detail; không render raw QR
hoặc suy ra Code/SN từ QR.

# FLOW-06 – Thu hồi phiếu hợp lệ

## Goal

Hủy nhu cầu mượn khi chưa có asset nào của phiếu được bàn giao.

## Actor

Nhân viên sở hữu phiếu.

## Related User Stories

`US-F03-04`.

## Preconditions

Phiếu thuộc user hiện tại; chưa có asset nào của phiếu ở `BORROWED`.

## Main Flow

1. User mở Request Detail và chọn thu hồi.
2. UI hiển thị xác nhận, nêu rõ các asset RESERVED sẽ được giải phóng.
3. User xác nhận.
4. Hệ thống đặt header `CANCELLED`, giữ nguyên detail và trả mọi asset RESERVED của phiếu về AVAILABLE.
5. Detail screen/list phản ánh kết quả mới.

## Alternative Flows

- Phiếu chỉ có PENDING/REJECTED cũng có thể thu hồi nếu thỏa điều kiện chưa bàn giao.

## Error / Invalid States

- Có ít nhất một asset BORROWED: không cho thu hồi, hướng user sang quy trình hoàn trả.
- Phiếu không thuộc user: không render action hoặc backend từ chối.

## Result

Phiếu được thu hồi hợp lệ hoặc toàn bộ dữ liệu giữ nguyên.

## Related Screens

`SCR-F03-02`, `SCR-F03-03`, `SCR-F05-01`.
