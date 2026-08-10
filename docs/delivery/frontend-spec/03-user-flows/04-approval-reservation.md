# FLOW-07 – Xem hàng đợi duyệt

## Goal

Tìm các request/detail cần xử lý trong phạm vi permission.

## Actor

User có permission xem request cần xử lý.

## Related User Stories

`US-F04-01`.

## Preconditions

User đã đăng nhập và có permission tương ứng.

## Main Flow

1. User mở `SCR-F04-01` từ navigation hoặc Dashboard.
2. Hệ thống hiển thị request/detail thuộc phạm vi được phép, kèm trạng thái header và detail.
3. User filter hoặc mở `SCR-F03-03` để xem context đầy đủ; Approval Details hiển thị mã user của requester tại trường `EMPLOYEE ID`.

## Alternative Flows

- Dashboard shortcut mở Review Queue với trạng thái cần xử lý.

## Error / Invalid States

- Thiếu permission: forbidden, không cung cấp dữ liệu của người khác.

## Result

User xác định được detail `PENDING` cần xử lý.

## Related Screens

`SCR-APP-01`, `SCR-F04-01`, `SCR-F03-03`, `SCR-SYS-02`.

# FLOW-08 – Duyệt một detail và giữ asset

## Goal

Duyệt detail PENDING hợp lệ để giữ asset trước bàn giao.

## Actor

User có permission duyệt.

## Related User Stories

`US-F04-02`.

## Preconditions

Detail PENDING; user có permission duyệt.

## Main Flow

1. User mở Request Detail từ Review Queue.
2. UI hiển thị trạng thái detail/asset hiện tại và action duyệt khi hợp lệ.
3. User xác nhận duyệt.
4. Hệ thống xử lý nguyên tử: detail thành APPROVED, asset AVAILABLE thành RESERVED, ghi reviewer/time.
5. UI refresh header/detail và thông báo kết quả.

## Alternative Flows

- Header có thể thành APPROVED hoặc PARTIALLY_APPROVED theo các detail còn lại.

## Error / Invalid States

- Asset không còn AVAILABLE hoặc thao tác đồng thời đã giữ asset: báo conflict; detail giữ PENDING.
- Bất kỳ bước nào thất bại: UI lấy lại trạng thái server, không hiển thị thành công một phần.

## Result

Chỉ một detail được giữ asset; reservation chưa phải bàn giao.

## Related Screens

`SCR-F04-01`, `SCR-F03-03`.

# FLOW-09 – Từ chối một detail

## Goal

Từ chối detail PENDING với lý do để người yêu cầu hiểu quyết định.

## Actor

User có permission từ chối.

## Related User Stories

`US-F04-03`.

## Preconditions

Detail đang PENDING.

## Main Flow

1. User mở action từ Request Detail.
2. UI yêu cầu rejection reason.
3. User xác nhận từ chối.
4. Hệ thống đặt detail REJECTED, ghi reviewer/time/reason; asset không đổi status.
5. UI cập nhật detail/header.

## Alternative Flows

- Rejection reason hiển thị cho owner trong cùng Request Detail.

## Error / Invalid States

- Thiếu reason hoặc detail không còn PENDING: không hoàn tất action.

## Result

Detail REJECTED có lý do; asset không bị giữ do thao tác từ chối.

## Related Screens

`SCR-F03-03`, `SCR-F04-01`.

# FLOW-10 – Approve All theo partial success

## Goal

Duyệt nhanh các detail PENDING đủ điều kiện mà không cấp trùng asset.

## Actor

User có permission duyệt.

## Related User Stories

`US-F04-04`.

## Preconditions

Request có ít nhất một detail PENDING; user có permission duyệt.

## Main Flow

1. User mở Request Detail và chọn Approve All.
2. UI yêu cầu xác nhận action bulk.
3. Hệ thống kiểm tra/xử lý độc lập từng detail PENDING.
4. UI hiển thị kết quả theo từng detail: thành công hoặc vẫn PENDING kèm lý do không giữ được asset.
5. Header và queue cập nhật theo trạng thái tổng suy ra.

## Alternative Flows

- Toàn bộ detail hợp lệ: request có thể thành APPROVED.

## Error / Invalid States

- Một detail conflict không rollback các detail đã duyệt thành công.
- Detail không đủ điều kiện không bị tự chuyển REJECTED.

## Result

Kết quả partial success minh bạch và mỗi detail thành công vẫn nguyên tử.

## Related Screens

`SCR-F03-03`, `SCR-F04-01`.
