# Screen Inventory

Trạng thái Stitch chỉ mô tả mức độ phù hợp về nội dung/flow với MVP, không phải đánh giá chất lượng visual. `NEEDS_UPDATE` nghĩa là có thể tái dùng layout/design language nhưng content, state hoặc action phải sửa.

| ID | Screen Name | Feature | Actor / Permission | Related User Stories | Main Purpose | Main Entry Point | Main Actions | Existing Stitch Screen | Stitch Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCR-SYS-01 | Login | F01 | User có tài khoản | US-F01-01..03 | Xác thực user nội bộ và bắt đầu phiên. | Root/guest entry. | Đăng nhập; hiển thị lỗi xác thực chung. | AUTH-01 | NEEDS_UPDATE |
| SCR-SYS-03 | Registration Request | F01 | Guest | US-F01-05 | Gửi yêu cầu đăng ký để reviewer xét duyệt; không cho guest tự chọn role/department. | Login entry. | Nhập thông tin cơ bản; gửi request; xem thông báo chờ duyệt. | AUTH-02 | NEEDS_UPDATE |
| SCR-APP-01 | Workspace Dashboard | App/F01 | User đã đăng nhập; nội dung theo effective permissions | US-F01-04; shortcut đến F02–F08 | Dashboard vận hành chung: personal summary, operational summary/queue theo permission và quick access; không tạo role dashboard hoặc analytics mới. | Sau login; logo/breadcrumb. | Mở khu vực được cấp quyền; xem summary/queue được phép. | Workspace Dashboard; DASH-01, DASH-02, DASH-03 | NEEDS_UPDATE |
| SCR-SYS-02 | Access & Resource Result | System | Mọi user | US-F01-04; AC not-found/forbidden xuyên suốt | Biểu đạt forbidden hoặc resource không tồn tại an toàn. | Protected route/resource entry. | Quay về Dashboard hoặc list an toàn. | SYS-403 | NEEDS_UPDATE |
| SCR-F02-01 | Asset List | F02/F03 | Permission xem asset; nhân viên chọn asset | US-F02-01, US-F02-03, US-F02-08, US-F03-01 | Tra cứu/lọc asset; tái dùng mode chọn asset cho phiếu mượn. | Navigation Thiết bị; Dashboard; Create Request. | Search/filter; mở detail; điều hướng tới Asset QR Scan hoặc mở QR URL đã dán; chọn asset khi ở selection mode. | AST-01, AST-02 | NEEDS_UPDATE |
| SCR-F02-05 | Asset QR Scan | F02 | `asset.view` | US-F02-08 | Quét QR bằng camera và chuyển tới QR entry route. | Asset List; Dashboard. | Start/stop camera; scan again. | Chưa có | NEW |
| SCR-F02-02 | Asset Detail | F02/F06 | Permission xem asset; action theo permission | US-F02-02, US-F02-05, US-F02-07, US-F02-08, US-F06-01 | Xem định danh, model, department, status và action hợp lệ của một asset. | Asset List; QR; related notification. | Edit; retire; mở báo issue khi được phép. | AST-03 | NEEDS_UPDATE |
| SCR-F02-03 | Asset Form | F02 | Permission tạo/cập nhật asset | US-F02-04, US-F02-05 | Tạo hoặc cập nhật thông tin asset, gồm image URL tùy chọn. | Asset List/Detail. | Save; cancel; validation QR/serial/reference. | AST-04 | NEEDS_UPDATE |
| SCR-F02-04 | Asset Catalog | F02 | Permission quản lý catalog | US-F02-06 | Xem, tạo, cập nhật brand/type/model trong một catalog area. | Navigation Danh mục; Asset Form. | Chọn tab catalog; create/update item. | AST-05 | NEEDS_UPDATE |
| SCR-F03-01 | Create Borrow Request | F03 | Nhân viên | US-F03-01 | Tạo một phiếu từ một hoặc nhiều asset AVAILABLE. | Asset selection mode; Dashboard. | Chọn/bỏ chọn asset; đặt expected return date; gửi phiếu. | BOR-01 | NEEDS_UPDATE |
| SCR-F03-02 | My Borrow Requests | F03 | Nhân viên | US-F03-02 | Theo dõi các phiếu do user hiện tại tạo. | Navigation Phiếu của tôi; Dashboard. | Filter; mở Request Detail; khởi tạo request mới. | BOR-02 | NEEDS_UPDATE |
| SCR-F03-03 | Borrow Request Detail | F03/F04/F05 | Owner hoặc permission xem/xử lý request | US-F03-03, US-F03-04, US-F04-02..04, US-F05-01 | Hiển thị header, từng detail và action đúng trạng thái/quyền. | My Requests; Review Queue; notification. | Thu hồi hợp lệ; approve/reject detail; Approve All; mở bàn giao/nhận trả context. | BOR-03, BOR-07 | NEEDS_UPDATE |
| SCR-F04-01 | Review Queue | F04 | Permission xem request cần xử lý | US-F04-01 | Tìm và mở request/detail theo filter `PENDING`, `ALL`, `APPROVED` hoặc `REJECTED` trong phạm vi được cấp; mặc định Pending và khi xem All vẫn ưu tiên request có detail Pending. | Navigation Chờ phê duyệt; Dashboard. | Chọn status filter; mở Request Detail. | BOR-06 | NEEDS_UPDATE |
| SCR-F05-01 | Handover & Return | F05 | `asset.checkout` và/hoặc `asset.checkin` | US-F05-01, US-F05-03 | Một screen có hai tab `Pending Handover` và `Pending Return`; top-level queue là group theo request và chỉ hiển thị summary/count, không render đống asset/history con tại queue. | Navigation; Approval Detail link; Dashboard. | Xem tiến độ theo request; mở Handover Detail hoặc Return Detail; retry và pagination theo request. | BOR-07, BOR-09 | IMPLEMENTED |
| SCR-F05-03 | Handover Detail | F05 | `asset.checkout` | US-F05-01 | Chi tiết một borrow request dành cho admin/manager kiểm tra asset, chụp evidence và xác nhận handover từng detail; không có bulk handover trong MVP. | Handover Queue; Approval Detail. | Quay lại queue; xem requester/progress; match asset; capture/upload evidence; confirm từng asset; xử lý conflict và refresh. | BOR-11 | IMPLEMENTED |
| SCR-F05-04 | Return Detail | F05 | `asset.checkin` | US-F05-03 | Chi tiết một borrow request dành cho admin/manager kiểm tra history, chọn normal/damaged return, chụp evidence và xác nhận từng history. | Pending Return queue. | Quay lại queue; xem requester/progress; inspect asset/history; capture/upload evidence; confirm normal/damaged return; xử lý conflict và refresh. | BOR-12 | IMPLEMENTED |
| SCR-F05-02 | Borrowing Activity | F05 | Nhân viên hoặc permission xem lịch sử toàn bộ | US-F05-02, US-F05-04, US-F05-05 | Hai tab `Currently Borrowed` và `Returned History` dùng bảng chuẩn theo request; mỗi dòng request có thể mở bảng con asset histories matching tab; không có status cấp group. | Navigation Borrowing Activity; Dashboard. | Chọn tab; expand/collapse request row; mở Borrowing Activity Detail của một asset history; pagination theo request. | BOR-04, BOR-05, BOR-10 | IMPLEMENTED |
| SCR-F06-01 | Asset Issue List | F06 | `asset_issue.view` | US-F06-02, US-F06-03 | Theo dõi issue theo trạng thái và mở context xử lý. | Navigation Sự cố & sửa chữa; Dashboard. | Filter status/asset; mở Issue Detail; phân trang. | REP-01 | IMPLEMENTED |
| SCR-F06-02 | Asset Issue Detail | F06 | `asset_issue.view`; action theo `asset_issue.create/update/close` | US-F06-01, US-F06-02..06 | Xem issue và xử lý transition hợp lệ trong đúng context. | Issue List; Asset Detail; return damaged flow; notification. | Confirm/reject; start repair; update; complete/fail bằng modal trong cùng context. | REP-02, REP-03, REP-04, REP-05 | IMPLEMENTED |
| SCR-VEN-01 | Vendor Management | Shared master/F06 | `vendor.view`; actions theo `vendor.create/update/manage_status` | US-VEN-01 | Search, phân trang, lọc Active/Inactive và quản lý shared vendor. | Navigation Vendors; issue repair selector không mở màn này. | Create; Edit thông tin và status trong cùng modal; không hiển thị action Delete; status gọi permission riêng. | Chưa có | NEW |
| SCR-F07-01 | Notification Center | F07 | User đã đăng nhập | US-F07-01..03 | Xem, đọc và mở notification của chính mình. | Header bell; sidebar; Dashboard. | All/Unread; mark read; mark all read; open related entity; phân trang. | Stitch source `c30e1b9426b04704ae2bec0aa666a935` | IMPLEMENTED |
| SCR-F08-01 | User List | F08 | Permission xem/quản lý user | US-F08-01, US-F08-04 | Tìm user và khởi động thao tác quản trị được cấp quyền. | Navigation Người dùng; Dashboard. | Search/filter; create; open User Form; activate/deactivate khi có `user.manage_status`. | USR-01 | NEEDS_UPDATE |
| SCR-F08-02 | User Form & Roles | F08 | Permission create/update user và/hoặc assign role | US-F08-02, US-F08-03, US-F08-05 | Tạo/cập nhật user, avatar URL và tập role có sẵn trong một form context. | User List. | Save; cancel; assign/remove existing role. | USR-02, USR-03, USR-04 | NEEDS_UPDATE |
| SCR-F08-03 | Registration Review Queue | F01/F08 | `user_registration.review` | US-F01-06 | Tìm và theo dõi pending/history registration requests. | Administration tab; Dashboard. | Status filter; search; pagination; open detail. | Stitch `9884061c33ae48158e15925b1781c2b0` | IMPLEMENTED |
| SCR-F08-04 | Registration Review Detail | F01/F08 | `user_registration.review` | US-F01-06 | Review applicant, choose required department/initial roles and record approve/reject outcome. | Registration Queue. | Approve and create user; reject with optional reason. | Stitch `f9d37a6af05c4ca39c3dd4b81e5297b4` | IMPLEMENTED |
| SCR-F08-05 | Role List | F08 | `role.view` or related role capability | US-F08-06..08 | View system/custom roles, permission count and assigned-user count. | Administration tab. | Open role; create custom role; no delete. | Stitch source `9193bc94d4514257b083cda63ab51cc0` | IMPLEMENTED |
| SCR-F08-06 | Role Create & Detail | F08 | `role.view/create/update`, `permission.view` | US-F08-06..08 | Create/rename role and replace grouped permission set with descriptions. | Role List. | Save name/permissions; no delete; system-name notice. | Stitch source `0e574f09c51a46daae829f30c75372d7` | IMPLEMENTED |
| SCR-F08-07 | Department Management | F08 | `department.view`; actions theo `department.create/update/manage_status` | FR-F08-13..15 | Xem và quản lý department active/inactive, giữ liên kết/history và chặn assignment mới vào department inactive. | Administration tab; Registration Review. | List; create; edit name; activate/deactivate trong edit modal; không có delete. | Chưa có | NEW |

## Reuse bắt buộc

| Screen/template | Reuse giữa User Story |
| --- | --- |
| Asset List | Xem asset, xem asset AVAILABLE, QR lookup target, chọn asset khi tạo phiếu. |
| Borrow Request Detail | Owner theo dõi/thu hồi; approver xử lý detail/bulk; fulfillment mở context giao/trả. |
| Handover & Return | Hai tab Pending Handover và Pending Return, summary group theo borrow request; mỗi tab mở detail tương ứng để xử lý từng asset/history kèm evidence. |
| Borrowing Activity | Asset đang mượn và lịch sử trả theo request group, lịch sử cá nhân hoặc toàn bộ theo permission; status canonical xem trong Asset/History Detail. |
| Asset Issue Detail | Report context, review, repair lifecycle. |
| User Form & Roles | Create user, update user và assign/remove role. |
| Access & Resource Result | Forbidden và not-found xuyên suốt các protected screen. |

## SCR-APP-01 — Workspace Dashboard

`SCR-APP-01` là một logical dashboard duy nhất, không phải shortcut launcher thuần túy và không phân theo Employee/Manager/Admin. Nội dung được dựng từ hợp (effective permissions) của mọi role được gán; section không đủ capability không render và các section còn lại tự reflow, không để placeholder trống hoặc block chồng lên nhau.

| Section | Nội dung được phép | Điều kiện hiển thị | Screen/queue đích |
| --- | --- | --- | --- |
| Personal Summary | Dữ liệu vận hành của chính user, ví dụ số asset đang mượn và số request đang chờ/đang xử lý. Không hiển thị dữ liệu user khác. | User đã xác thực, có quyền truy cập dữ liệu của chính mình. | `SCR-F03-02`, `SCR-F05-02` |
| Asset Overview | Các count trực tiếp từ dữ liệu asset canonical: tổng, AVAILABLE, RESERVED, BORROWED, DAMAGED, IN_REPAIR, RETIRED. Đây là operational summary. | Capability xem operational asset overview. | `SCR-F02-01` |
| Approval Work Queue | Summary/count request-detail đang chờ xử lý và link Review Queue. Approval vẫn ở detail-level. | Capability xử lý approval. | `SCR-F04-01` |
| Fulfillment Work Queue | Summary/count asset RESERVED chờ handover và BORROWED chờ nhận trả. | Capability handover và/hoặc return. | `SCR-F05-01` |
| Issue Work Queue | Summary/count và entry vào issue cần xử lý. | Capability xử lý asset issue. | `SCR-F06-01` |
| Administration Entry | Entry vào quản lý user, department, registration và role. | Capability tương ứng. | `SCR-F08-01`, `SCR-F08-07` |
| Quick Access | Shortcut đến các logical screen hiện hữu; là phần hỗ trợ, không phải nội dung duy nhất của dashboard. | Theo capability của shortcut. | Các screen F02–F08 tương ứng |

Mọi metric hoặc queue phải trace được tới dữ liệu domain và screen đã tồn tại. Không tạo chart, trend, growth percentage, monthly analytics hay KPI mới.

## Không tạo screen riêng

- Refresh session, logout và permission check là application behavior.
- Reject detail, Approve All result, retire asset, individual handover/return, report issue, confirm/reject issue, start/update/close repair, activate/deactivate user là workflow state có context; handover context nằm trong `SCR-F05-03`, return context nằm trong `SCR-F05-04`.
- QR scan là entry/capture mechanism vào Asset Detail, không phải module inventory; camera chỉ do Asset QR Scan sở hữu, Asset List chỉ điều hướng tới scanner.
- Department delete, role delete, permission CRUD và dashboard theo role đều ngoài MVP; Department Management chỉ hỗ trợ status lifecycle.
