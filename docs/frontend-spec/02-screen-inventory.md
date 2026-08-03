# Screen Inventory

Trạng thái Stitch chỉ mô tả mức độ phù hợp về nội dung/flow với MVP, không phải đánh giá chất lượng visual. `NEEDS_UPDATE` nghĩa là có thể tái dùng layout/design language nhưng content, state hoặc action phải sửa.

| ID | Screen Name | Feature | Actor / Permission | Related User Stories | Main Purpose | Main Entry Point | Main Actions | Existing Stitch Screen | Stitch Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCR-SYS-01 | Login | F01 | User có tài khoản | US-F01-01..03 | Xác thực user nội bộ và bắt đầu phiên. | Root/guest entry. | Đăng nhập; hiển thị lỗi xác thực chung. | AUTH-01 | NEEDS_UPDATE |
| SCR-APP-01 | Workspace Dashboard | App/F01 | User đã đăng nhập; nội dung theo effective permissions | US-F01-04; shortcut đến F02–F08 | Dashboard vận hành chung: personal summary, operational summary/queue theo permission và quick access; không tạo role dashboard hoặc analytics mới. | Sau login; logo/breadcrumb. | Mở khu vực được cấp quyền; xem summary/queue được phép. | Workspace Dashboard; DASH-01, DASH-02, DASH-03 | NEEDS_UPDATE |
| SCR-SYS-02 | Access & Resource Result | System | Mọi user | US-F01-04; AC not-found/forbidden xuyên suốt | Biểu đạt forbidden hoặc resource không tồn tại an toàn. | Protected route/resource entry. | Quay về Dashboard hoặc list an toàn. | SYS-403 | NEEDS_UPDATE |
| SCR-F02-01 | Asset List | F02/F03 | Permission xem asset; nhân viên chọn asset | US-F02-01, US-F02-03, US-F02-08, US-F03-01 | Tra cứu/lọc asset; tái dùng mode chọn asset cho phiếu mượn. | Navigation Thiết bị; Dashboard; Create Request. | Search/filter; mở detail; quét/nhập QR; chọn asset khi ở selection mode. | AST-01, AST-02 | NEEDS_UPDATE |
| SCR-F02-02 | Asset Detail | F02/F06 | Permission xem asset; action theo permission | US-F02-02, US-F02-05, US-F02-07, US-F02-08, US-F06-01 | Xem định danh, model, department, status và action hợp lệ của một asset. | Asset List; QR; related notification. | Edit; retire; mở báo issue khi được phép. | AST-03 | NEEDS_UPDATE |
| SCR-F02-03 | Asset Form | F02 | Permission tạo/cập nhật asset | US-F02-04, US-F02-05 | Tạo hoặc cập nhật thông tin asset, gồm image URL tùy chọn. | Asset List/Detail. | Save; cancel; validation QR/serial/reference. | AST-04 | NEEDS_UPDATE |
| SCR-F02-04 | Asset Catalog | F02 | Permission quản lý catalog | US-F02-06 | Xem, tạo, cập nhật brand/type/model trong một catalog area. | Navigation Danh mục; Asset Form. | Chọn tab catalog; create/update item. | AST-05 | NEEDS_UPDATE |
| SCR-F03-01 | Create Borrow Request | F03 | Nhân viên | US-F03-01 | Tạo một phiếu từ một hoặc nhiều asset AVAILABLE. | Asset selection mode; Dashboard. | Chọn/bỏ chọn asset; đặt expected return date; gửi phiếu. | BOR-01 | NEEDS_UPDATE |
| SCR-F03-02 | My Borrow Requests | F03 | Nhân viên | US-F03-02 | Theo dõi các phiếu do user hiện tại tạo. | Navigation Phiếu của tôi; Dashboard. | Filter; mở Request Detail; khởi tạo request mới. | BOR-02 | NEEDS_UPDATE |
| SCR-F03-03 | Borrow Request Detail | F03/F04/F05 | Owner hoặc permission xem/xử lý request | US-F03-03, US-F03-04, US-F04-02..04, US-F05-01 | Hiển thị header, từng detail và action đúng trạng thái/quyền. | My Requests; Review Queue; notification. | Thu hồi hợp lệ; approve/reject detail; Approve All; mở bàn giao/nhận trả context. | BOR-03, BOR-07 | NEEDS_UPDATE |
| SCR-F04-01 | Review Queue | F04 | Permission xem request cần xử lý | US-F04-01 | Tìm và mở request/detail còn PENDING trong phạm vi được cấp. | Navigation Chờ phê duyệt; Dashboard. | Filter; mở Request Detail. | BOR-06 | NEEDS_UPDATE |
| SCR-F05-01 | Fulfillment Queue | F05 | Permission bàn giao và/hoặc nhận trả | US-F05-01, US-F05-03 | Xử lý detail RESERVED cần giao và history BORROWED cần nhận trả. | Navigation; Request Detail; Dashboard. | Chuyển queue; xác nhận handover; xác nhận return thường/hỏng. | BOR-07, BOR-09 | NEEDS_UPDATE |
| SCR-F05-02 | Borrowing Activity | F05 | Nhân viên hoặc permission xem lịch sử toàn bộ | US-F05-02, US-F05-04, US-F05-05 | Xem asset đang mượn và history theo phạm vi quyền. | Navigation Lịch sử mượn; Dashboard. | Chọn current/history; filter; mở asset/request liên quan khi được phép. | BOR-04, BOR-05, BOR-10 | NEEDS_UPDATE |
| SCR-F06-01 | Asset Issue List | F06 | Permission xem/quản lý issue | US-F06-02, US-F06-03 | Theo dõi issue theo trạng thái và mở context xử lý. | Navigation Sự cố & sửa chữa; Dashboard. | Filter; mở Issue Detail. | REP-01 | NEEDS_UPDATE |
| SCR-F06-02 | Asset Issue Detail | F06 | Reporter có quyền xem hoặc permission xử lý issue | US-F06-01, US-F06-02..06 | Xem issue và xử lý transition hợp lệ trong đúng context. | Issue List; Asset Detail; return damaged flow; notification. | Report; confirm/reject; start repair; update; complete/fail. | REP-02, REP-03, REP-04, REP-05 | NEEDS_UPDATE |
| SCR-F07-01 | Notification Center | F07 | User đã đăng nhập | US-F07-01..03 | Xem, đọc và mở notification của chính mình. | Header notification entry; Dashboard. | Mark read; open related entity. | Không có | MISSING |
| SCR-F08-01 | User List | F08 | Permission xem/quản lý user | US-F08-01, US-F08-04 | Tìm user và khởi động thao tác quản trị được cấp quyền. | Navigation Người dùng; Dashboard. | Search/filter; create; open User Form; activate/deactivate. | USR-01 | NEEDS_UPDATE |
| SCR-F08-02 | User Form & Roles | F08 | Permission create/update user và/hoặc assign role | US-F08-02, US-F08-03, US-F08-05 | Tạo/cập nhật user, avatar URL và tập role có sẵn trong một form context. | User List. | Save; cancel; assign/remove existing role. | USR-02, USR-03, USR-04 | NEEDS_UPDATE |

## Reuse bắt buộc

| Screen/template | Reuse giữa User Story |
| --- | --- |
| Asset List | Xem asset, xem asset AVAILABLE, QR lookup target, chọn asset khi tạo phiếu. |
| Borrow Request Detail | Owner theo dõi/thu hồi; approver xử lý detail/bulk; fulfillment mở context giao/trả. |
| Fulfillment Queue | Handover, normal return và damaged return. |
| Borrowing Activity | Asset đang mượn, lịch sử cá nhân, lịch sử toàn bộ theo permission. |
| Asset Issue Detail | Report context, review, repair lifecycle. |
| User Form & Roles | Create user, update user và assign/remove role. |
| Access & Resource Result | Forbidden và not-found xuyên suốt các protected screen. |

## SCR-APP-01 — Workspace Dashboard

`SCR-APP-01` là một logical dashboard duy nhất, không phải shortcut launcher thuần túy và không phân theo Staff/Manager/Admin. Nội dung được dựng từ hợp (effective permissions) của mọi role được gán; section không đủ capability không render và các section còn lại tự reflow, không để placeholder trống hoặc block chồng lên nhau.

| Section | Nội dung được phép | Điều kiện hiển thị | Screen/queue đích |
| --- | --- | --- | --- |
| Personal Summary | Dữ liệu vận hành của chính user, ví dụ số asset đang mượn và số request đang chờ/đang xử lý. Không hiển thị dữ liệu user khác. | User đã xác thực, có quyền truy cập dữ liệu của chính mình. | `SCR-F03-02`, `SCR-F05-02` |
| Asset Overview | Các count trực tiếp từ dữ liệu asset canonical: tổng, AVAILABLE, RESERVED, BORROWED, DAMAGED, IN_REPAIR, RETIRED. Đây là operational summary. | Capability xem operational asset overview. | `SCR-F02-01` |
| Approval Work Queue | Summary/count request-detail đang chờ xử lý và link Review Queue. Approval vẫn ở detail-level. | Capability xử lý approval. | `SCR-F04-01` |
| Fulfillment Work Queue | Summary/count asset RESERVED chờ handover và BORROWED chờ nhận trả. | Capability handover và/hoặc return. | `SCR-F05-01` |
| Issue Work Queue | Summary/count và entry vào issue cần xử lý. | Capability xử lý asset issue. | `SCR-F06-01` |
| Administration Entry | Entry vào quản lý user. | Capability quản lý user. | `SCR-F08-01` |
| Quick Access | Shortcut đến các logical screen hiện hữu; là phần hỗ trợ, không phải nội dung duy nhất của dashboard. | Theo capability của shortcut. | Các screen F02–F08 tương ứng |

Mọi metric hoặc queue phải trace được tới dữ liệu domain và screen đã tồn tại. Không tạo chart, trend, growth percentage, monthly analytics hay KPI mới.

## Không tạo screen riêng

- Refresh session, logout và permission check là application behavior.
- Reject detail, Approve All result, retire asset, handover, return, report issue, confirm/reject issue, start/update/close repair, activate/deactivate user là workflow state có context.
- QR scan là entry/capture mechanism vào Asset Detail, không phải module inventory.
- Department CRUD, role CRUD, permission CRUD, registration và dashboard theo role đều ngoài MVP.
