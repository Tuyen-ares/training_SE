# FLOW-11 – Xác nhận bàn giao

## Goal

Giao asset đã RESERVED cho người mượn và tạo lịch sử thực tế.

`SCR-F05-01` dùng một route `/handover-return` với hai tab logic:
`Pending Handover` và `Pending Return` theo capability.
Tab bàn giao yêu cầu `asset.checkout`, tab nhận trả yêu cầu
`asset.checkin`; tab không có quyền không render và không gọi API
tương ứng. Khi có cả hai quyền, màn hình mặc định mở `Pending Handover`.
Top-level queue là một group cho mỗi borrow request, bên trong có các asset/history
con; queue có loading/empty/error/retry/pagination. Handover group chỉ mở
`SCR-F05-03`; confirm và evidence không nằm ở queue.

## Actor

User có permission bàn giao.

## Related User Stories

`US-F05-01`.

## Preconditions

Detail APPROVED, asset RESERVED cho đúng detail và chưa có borrow history.

## Main Flow

1. User mở entry `Handover & Return` và chọn tab `Pending Handover`.
2. Hệ thống gọi `GET /api/borrow-request-details/handover-queue` và hiển thị mỗi request một group với requester/department, request date, tiến độ approved/handed over và danh sách asset đủ điều kiện.
3. User mở Handover Detail. Hệ thống gọi `GET /api/borrow-request-details/handover-queue/:requestId` và hiển thị toàn bộ context của request cùng các asset còn chờ bàn giao.
4. User kiểm tra asset, chụp/upload evidence tùy chọn cho đúng asset rồi chọn `Confirm handover` trên từng detail.
5. Hệ thống gọi `POST /api/borrow-request-details/:detailId/handover`, tạo một borrow history, ghi handed_over_by/borrow_date và chuyển asset RESERVED sang BORROWED.
6. UI hiển thị success hoặc conflict, reload detail; asset đã bàn giao biến mất khỏi actionable list và progress được cập nhật.

## Alternative Flows

- Approval Detail không thực hiện handover trực tiếp; với detail `APPROVED` + asset `RESERVED`, user có `asset.checkout` thấy link mở Handover Detail của request tương ứng.

## Error / Invalid States

- Asset/detail không còn ở trạng thái nguồn hoặc history đã tồn tại: không tạo lịch sử/status một phần.

## Result

Asset được ghi nhận là đang mượn; borrower được truy qua request.

## Related Screens

`SCR-F05-01`, `SCR-F03-03`, `SCR-F05-03`.

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

1. User mở entry `Handover & Return` và chọn tab `Pending Return`.
2. Hệ thống gọi `GET /api/borrow-histories/return-queue` và hiển thị mỗi request một summary group với số history đang chờ trả; pagination/total tính theo request, không render toàn bộ history/action trong queue.
3. User mở Return Detail. Hệ thống gọi `GET /api/borrow-histories/return-queue/:requestId` và hiển thị context của request cùng các history chưa trả.
4. User chọn normal return hoặc damaged return trên từng history; có thể chụp/upload evidence cho đúng history.
5. Hệ thống gọi API return tương ứng, ghi received_by, return_date, return_condition và chuyển asset BORROWED sang AVAILABLE/DAMAGED.
6. Nếu mọi detail được duyệt/bàn giao đã trả và không còn PENDING, header chuyển COMPLETED; UI reload detail sau success/conflict.

## Alternative Flows

- Queue refresh thành công có thể đưa record sang Borrowing Activity/history.

## Error / Invalid States

- History đã trả hoặc asset không BORROWED: từ chối, không ghi chồng dữ liệu.
- Lỗi ở bất kỳ cập nhật nào: không giữ history/asset ở trạng thái một phần.

## Result

Lượt mượn hoàn tất bình thường và asset sẵn sàng cho workflow mới.

## Related Screens

`SCR-F05-01`, `SCR-F05-02`, `SCR-F03-03`, `SCR-F05-04`.

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

1. User mở tab `Pending Return` trong `Handover & Return`.
2. User mở Return Detail, kiểm tra history và chọn action `Damaged return`.
3. User nhập mô tả hư hỏng bắt buộc, có thể thêm evidence rồi xác nhận.
4. Hệ thống gọi `POST /api/borrow-histories/:historyId/return-damaged`, ghi return,
   tạo asset issue `CONFIRMED` và chuyển asset BORROWED sang DAMAGED trong cùng
   transaction.
5. UI phản ánh return thành công, nhận `issueId` từ response và có thể mở/link đến
   Issue Detail khi user có quyền xem issue.

## Alternative Flows

- Issue manager nhận notification và xử lý issue từ Issue List/Detail.

## Error / Invalid States

- Không giữ asset BORROWED sau khi return đã được ghi.
- Nếu transaction thất bại, UI không coi return/issue là hoàn tất.

## Result

History hoàn trả và issue CONFIRMED được liên kết theo nghiệp vụ; asset DAMAGED chờ xử lý.

## Related Screens

`SCR-F05-01`, `SCR-F05-04`, `SCR-F06-02`, `SCR-F07-01`.

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

1. User mở Borrowing Activity và chọn một trong hai tab `Currently Borrowed` hoặc `Returned History`.
2. Hệ thống gọi grouped activity endpoint tương ứng với permission (`/activity/me` cho `borrow_history.view_own`, `/activity` cho `borrow_history.view_all`) và lọc `state=CURRENT` hoặc `state=RETURNED`.
3. Hệ thống hiển thị bảng `AppTable` với một dòng cho mỗi borrow request; các cột có title chuẩn gồm request, requester, assets, activity và action. Pagination/total tính theo request, không theo history.
4. User expand một request row để xem bảng con có title cột và các asset histories matching tab, sau đó chọn `View Details` trên một asset history.
5. Hệ thống hiển thị request ID, created date, borrowing reason, asset metadata, approval metadata, handover metadata và return metadata nếu có. Không hiển thị status ở cấp group; canonical asset status được xem trong detail.
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

## Optional image evidence

Handover and both return actions expose the shared evidence picker. `Chụp ảnh`
opens the shared native environment preview and returns one reviewed File;
`Chọn ảnh` accepts multiple files. The picker processes JPEG/PNG/WebP
sequentially, keeps at most ten processed local files and uploads nothing before
Confirm. Confirm locks the modal and runs sequential presign → conditional PUT
→ complete for the whole batch before sending `mediaIds` to the business API.
Upload/business failure compensates every cancellable attempt ID and keeps local
files for a full retry with new IDs. Unknown cleanup blocks duplicate submission
until refresh/reconciliation. History detail renders saved evidence through the
canonical CloudFront URL.

## Asset identity presentation

Handover, Return và Borrowing Activity dùng chung presentation order Model, Code,
Seri ở desktop và mobile. Missing value là `—`; QR không xuất hiện trong
operational list hoặc history summary dạng text. Borrowing Activity Detail cũng
không render dòng QR code, nhưng QR workflow chuyên biệt ngoài flow này vẫn giữ
nguyên. Mobile có thể dùng stacked row/card hoặc intentional scroll theo table
foundation, nhưng không duplicate business/permission logic.
