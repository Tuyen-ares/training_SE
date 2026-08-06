# FLOW-11 – Xác nhận bàn giao

## Goal

Giao asset đã RESERVED cho người mượn và tạo lịch sử thực tế.

## Actor

User có permission bàn giao.

## Related User Stories

`US-F05-01`.

## Preconditions

Detail APPROVED, asset RESERVED cho đúng detail và chưa có borrow history.

## Main Flow

1. User mở Handover & Return Queue.
2. User chọn detail cần bàn giao và mở workflow xác nhận có context request/borrower.
3. User xác nhận bàn giao.
4. Hệ thống tạo borrow history, ghi handed_over_by/borrow_date và chuyển asset RESERVED sang BORROWED.
5. Queue và Request Detail cập nhật.

## Alternative Flows

- Request Detail có thể mở đúng handover context cho user có permission.

## Error / Invalid States

- Asset/detail không còn ở trạng thái nguồn hoặc history đã tồn tại: không tạo lịch sử/status một phần.

## Result

Asset được ghi nhận là đang mượn; borrower được truy qua request.

## Related Screens

`SCR-F05-01`, `SCR-F03-03`.

# FLOW-12 – Xác nhận hoàn trả bình thường

## Goal

Nhận lại asset BORROWED và trả thiết bị về AVAILABLE.

## Actor

User có permission nhận trả.

## Related User Stories

`US-F05-03`.

## Preconditions

Borrow history chưa có return date; asset đang BORROWED.

## Main Flow

1. User mở Return Queue và chọn history chưa trả.
2. User chọn return condition bình thường, bổ sung thông tin cần thiết.
3. User xác nhận return.
4. Hệ thống ghi received_by, return_date, return_condition và chuyển asset BORROWED sang AVAILABLE.
5. Nếu mọi detail được duyệt/bàn giao đã trả và không còn PENDING, header chuyển COMPLETED.

## Alternative Flows

- Queue refresh thành công có thể đưa record sang Borrowing Activity/history.

## Error / Invalid States

- History đã trả hoặc asset không BORROWED: từ chối, không ghi chồng dữ liệu.
- Lỗi ở bất kỳ cập nhật nào: không giữ history/asset ở trạng thái một phần.

## Result

Lượt mượn hoàn tất bình thường và asset sẵn sàng cho workflow mới.

## Related Screens

`SCR-F05-01`, `SCR-F05-02`, `SCR-F03-03`.

# FLOW-13 – Xác nhận hoàn trả asset hỏng

## Goal

Ghi nhận asset hỏng tại lúc trả và mở đúng vòng đời issue.

## Actor

User có permission nhận trả.

## Related User Stories

`US-F05-03`, `US-F06-03`.

## Preconditions

Borrow history chưa trả; asset BORROWED; người nhận xác nhận condition DAMAGED.

## Main Flow

1. User mở return workflow trong Fulfillment Queue.
2. User chọn condition DAMAGED và xác nhận.
3. Hệ thống ghi return, tạo asset issue `CONFIRMED` và chuyển asset BORROWED sang DAMAGED.
4. UI phản ánh return thành công và mở/link đến Issue Detail phù hợp.

## Alternative Flows

- Issue manager nhận notification và xử lý issue từ Issue List/Detail.

## Error / Invalid States

- Không giữ asset BORROWED sau khi return đã được ghi.
- Nếu transaction thất bại, UI không coi return/issue là hoàn tất.

## Result

History hoàn trả và issue CONFIRMED được liên kết theo nghiệp vụ; asset DAMAGED chờ xử lý.

## Related Screens

`SCR-F05-01`, `SCR-F06-02`, `SCR-F07-01`.

# FLOW-14 – Xem tài sản đang mượn và lịch sử

## Goal

Xem current borrow hoặc history theo phạm vi permission.

## Actor

Nhân viên; user có permission xem lịch sử toàn bộ.

## Related User Stories

`US-F05-02`, `US-F05-04`, `US-F05-05`.

## Preconditions

User đã đăng nhập và có permission scope phù hợp.

## Main Flow

1. User mở Borrowing Activity.
2. User chọn trạng thái xem hiện tại hoặc history; scope chỉ mở rộng khi có permission.
3. Hệ thống hiển thị asset, borrower khi được phép, handover/return time và return condition.
4. User chọn `View Details` trên một history.
5. Hệ thống hiển thị request ID, created date, borrowing reason, asset metadata, approval metadata, handover metadata và return metadata nếu có.
6. User có thể quay lại danh sách hoặc mở resource liên quan nếu còn quyền.

## Alternative Flows

- Employee mặc định chỉ thấy current/history truy về request của chính mình.

## Error / Invalid States

- Detail APPROVED chưa handover không xuất hiện là asset đang mượn.
- Thiếu permission all-history không hiển thị history của người khác.
- History detail ngoài phạm vi own trả về trạng thái không tìm thấy an toàn khi user chỉ có `borrow_history.view_own`.

## Result

User có dữ liệu lịch sử thực tế từ borrow histories, không suy ra từ approval status.

## Related Screens

`SCR-F05-02`, `SCR-F02-02`, `SCR-F03-03`.
