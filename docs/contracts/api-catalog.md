# BigIn Asset — API Catalog / Danh mục API

> Scope: full project catalogue for F01–F08. This is a short inventory, not a
> detailed API contract. Each planned endpoint needs its own approved DTO,
> validation, permission, error and transaction contract before implementation.
>
> Status: **Existing** = route is registered today; **Planned** = intended API;
> **Deferred** = intentionally outside the current implementation slice.

## F01 — Authentication & Access / Xác thực và truy cập

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `POST /api/auth/login` | Sign in | Đăng nhập | Authenticate an active user and issue a session. / Xác thực user active và cấp phiên. | Existing |
| `POST /api/auth/refresh` | Refresh session | Làm mới phiên | Exchange a valid refresh token for a new session. / Làm mới phiên từ refresh token hợp lệ. | Existing |
| `POST /api/auth/logout` | Sign out | Đăng xuất | Revoke the current refresh capability. / Thu hồi khả năng refresh của phiên hiện tại. | Existing |
| `POST /api/auth/register` | Legacy direct registration | Đăng ký trực tiếp cũ | Current endpoint that creates a user directly; it will be replaced by the registration-request workflow. / API hiện tại tạo user trực tiếp; sẽ được thay bằng workflow yêu cầu đăng ký. | Existing; to replace |
| `POST /api/registration-requests` | Submit registration request | Gửi yêu cầu đăng ký | Create a pending account request without creating a session. / Tạo yêu cầu chờ duyệt, không tạo phiên. | Planned |
| `GET /api/registration-requests` | List registration requests | Xem danh sách yêu cầu đăng ký | Let an authorized reviewer see pending requests. / Cho reviewer có quyền xem các yêu cầu chờ xử lý. | Planned |
| `GET /api/registration-requests/:requestId` | Get registration request | Xem chi tiết yêu cầu đăng ký | Read one registration request for review. / Xem một yêu cầu để xét duyệt. | Planned |
| `POST /api/registration-requests/:requestId/approve` | Approve registration request | Duyệt yêu cầu đăng ký | Create the active user with the chosen/default role and optional department. / Tạo user active với role chọn/mặc định và department tùy chọn. | Planned |
| `POST /api/registration-requests/:requestId/reject` | Reject registration request | Từ chối yêu cầu đăng ký | Reject a pending account request. / Từ chối yêu cầu đăng ký đang chờ. | Planned |

## F02 — Asset Management / Quản lý tài sản

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/assets` | List assets | Xem danh sách thiết bị | Search, filter and paginate assets. / Tìm kiếm, lọc và phân trang thiết bị. | Existing |
| `GET /api/assets/:assetId` | Get asset detail | Xem chi tiết thiết bị | Read the full asset detail and allowed actions. / Xem chi tiết asset và action được phép. | Existing |
| `POST /api/assets` | Create asset | Tạo thiết bị | Add a new asset with valid identity and model data. / Tạo asset với dữ liệu nhận diện và model hợp lệ. | Existing; scope needs completion |
| `PATCH /api/assets/:assetId` | Update asset | Cập nhật thiết bị | Update editable asset information. / Cập nhật thông tin asset được phép sửa. | Existing; scope needs completion |
| `POST /api/assets/:assetId/retire` | Retire asset | Ngừng sử dụng thiết bị | Retire an eligible asset through a dedicated lifecycle action. / Ngừng sử dụng asset đủ điều kiện bằng action riêng. | Planned |
| `POST /api/assets/:assetId/qr` | Generate asset QR | Tạo mã QR thiết bị | Generate or regenerate the asset QR identifier. / Tạo hoặc tạo lại mã QR của asset. | Planned |
| `GET /api/assets/by-qr/:qrCode` | Look up asset by QR | Tra cứu thiết bị bằng QR | Resolve a QR code to the asset detail. / Tra QR để mở chi tiết asset. | Planned |
| `GET /api/brands` | List brands | Xem danh sách hãng | Read asset brands. / Xem hãng thiết bị. | Existing |
| `POST /api/brands` | Create brand | Tạo hãng | Add a brand to the catalogue. / Thêm hãng vào danh mục. | Existing |
| `PATCH /api/brands/:brandId` | Update brand | Cập nhật hãng | Rename/update a brand. / Cập nhật hãng. | Existing |
| `GET /api/asset-types` | List asset types | Xem loại thiết bị | Read asset types. / Xem loại thiết bị. | Existing |
| `POST /api/asset-types` | Create asset type | Tạo loại thiết bị | Add an asset type. / Thêm loại thiết bị. | Existing |
| `PATCH /api/asset-types/:typeId` | Update asset type | Cập nhật loại thiết bị | Rename/update an asset type. / Cập nhật loại thiết bị. | Existing |
| `GET /api/asset-models` | List asset models | Xem model thiết bị | Read models with their brand/type context. / Xem model cùng hãng/loại. | Existing |
| `POST /api/asset-models` | Create asset model | Tạo model thiết bị | Add an asset model. / Thêm model thiết bị. | Existing |
| `PATCH /api/asset-models/:modelId` | Update asset model | Cập nhật model thiết bị | Update an asset model. / Cập nhật model thiết bị. | Existing |

## F03 — Borrow Request / Yêu cầu mượn

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `POST /api/borrow-requests` | Create borrow request | Tạo phiếu mượn | Create a request with one or more available assets. / Tạo phiếu gồm một hoặc nhiều asset available. | Existing |
| `GET /api/borrow-requests/me` | List my borrow requests | Xem phiếu mượn của tôi | List requests created by the current user. / Liệt kê phiếu do user hiện tại tạo. | Existing |
| `GET /api/borrow-requests/:requestId` | Get borrow request detail | Xem chi tiết phiếu mượn | Read a request and its per-asset details with ownership checks. / Xem phiếu và từng detail asset, có kiểm tra ownership. | Existing |
| `POST /api/borrow-requests/:requestId/cancel` | Cancel borrow request | Thu hồi phiếu mượn | Cancel an eligible request and release its reservations. / Thu hồi phiếu đủ điều kiện và giải phóng reservation. | Existing |

## F04 — Approval & Reservation / Duyệt và giữ chỗ

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/borrow-request-details/review-queue` | List review queue | Xem hàng đợi duyệt | List company-wide requests/details awaiting review. / Liệt kê phiếu/detail chờ duyệt toàn công ty trong MVP. | Existing |
| `POST /api/borrow-request-details/:detailId/approve` | Approve borrow detail | Duyệt một thiết bị trong phiếu | Atomically approve a pending detail and reserve its asset. / Duyệt detail pending và giữ chỗ asset một cách nguyên tử. | Existing |
| `POST /api/borrow-request-details/:detailId/reject` | Reject borrow detail | Từ chối một thiết bị trong phiếu | Reject a pending detail with a reason. / Từ chối detail pending kèm lý do. | Existing |
| `POST /api/borrow-requests/:requestId/approve-all` | Approve all eligible details | Duyệt tất cả detail đủ điều kiện | Process pending details with partial-success results. / Xử lý nhiều detail pending theo kết quả partial success. | Existing |

## F05 — Handover, Return & Borrow History / Bàn giao, hoàn trả và lịch sử mượn

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `POST /api/borrow-request-details/:detailId/handover` | Confirm handover | Xác nhận bàn giao | Mark a reserved asset as handed over and create its borrow history. / Xác nhận bàn giao asset reserved và tạo lịch sử mượn. | Existing |
| `GET /api/borrow-histories/current` | List my current borrows | Xem tài sản đang mượn | List assets currently borrowed by the current user. / Liệt kê asset user hiện tại đang mượn. | Existing |
| `POST /api/borrow-histories/:historyId/return` | Confirm return | Xác nhận hoàn trả | Record canonical normal return and make the asset available. / Ghi nhận trả bình thường canonical và đưa asset về available. | Existing |
| `GET /api/borrow-histories/me` | List my borrow history | Xem lịch sử mượn của tôi | List the current user's completed and open borrow history. / Xem lịch sử mượn đã/chưa hoàn trả của user hiện tại. | Existing |
| `GET /api/borrow-histories` | List all borrow history | Xem toàn bộ lịch sử mượn | Company-wide history for users with effective permission. / Tra cứu lịch sử toàn công ty theo effective permission. | Existing |
| `POST /api/borrow-histories/:historyId/return-damaged` | Return damaged asset | Xác nhận trả thiết bị hỏng | Return a damaged asset and create the linked confirmed issue. / Trả asset hỏng và tạo issue confirmed liên kết. | Deferred |

## F06 — Asset Issues & Repair / Sự cố và sửa chữa tài sản

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `POST /api/assets/:assetId/report-damaged` | Report asset issue | Báo sự cố thiết bị | Create a reported issue without changing asset status. / Tạo issue reported mà không đổi trạng thái asset. | Existing |
| `GET /api/asset-issues` | List asset issues | Xem danh sách sự cố | Search and filter issues the user may view. / Tìm kiếm và lọc issue user được phép xem. | Deferred |
| `GET /api/asset-issues/:issueId` | Get asset issue detail | Xem chi tiết sự cố | Read an issue and its repair information. / Xem issue và thông tin sửa chữa. | Deferred |
| `POST /api/asset-issues/:issueId/confirm` | Confirm asset issue | Xác minh sự cố | Confirm a reported issue and mark the asset damaged. / Xác nhận issue reported và chuyển asset damaged. | Deferred |
| `POST /api/asset-issues/:issueId/reject` | Reject asset issue | Từ chối sự cố | Reject a reported issue with a reason. / Từ chối issue reported kèm lý do. | Deferred |
| `POST /api/asset-issues/:issueId/start-repair` | Start repair | Bắt đầu sửa chữa | Start repair and move the asset into repair. / Bắt đầu sửa và chuyển asset sang in repair. | Deferred |
| `PATCH /api/asset-issues/:issueId/repair` | Update repair progress | Cập nhật quá trình sửa | Update repair provider, timing, cost, result and notes. / Cập nhật đơn vị, thời gian, chi phí, kết quả và ghi chú sửa chữa. | Deferred |
| `POST /api/asset-issues/:issueId/close-repair` | Close repair | Kết thúc sửa chữa | Close a repair as successful or failed and synchronize asset status. / Kết thúc sửa thành công/thất bại và đồng bộ trạng thái asset. | Deferred |

## F07 — Notifications / Thông báo

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/notifications` | List my notifications | Xem thông báo của tôi | List the current user's notifications in time order. / Liệt kê thông báo của user hiện tại theo thời gian. | Deferred |
| `GET /api/notifications/unread-count` | Get unread notification count | Xem số thông báo chưa đọc | Return the count of unread notifications for the current user. / Trả số thông báo chưa đọc của user hiện tại. | Deferred |
| `POST /api/notifications/:notificationId/read` | Mark notification as read | Đánh dấu thông báo đã đọc | Mark one owned notification as read. / Đánh dấu một thông báo thuộc user là đã đọc. | Deferred |
| `POST /api/notifications/read-all` | Mark all notifications as read | Đánh dấu tất cả thông báo đã đọc | Mark all current-user notifications as read. / Đánh dấu toàn bộ thông báo của user hiện tại đã đọc. | Deferred |

## F08 — Administration / Quản trị người dùng và phân quyền

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/users` | List users | Xem danh sách người dùng | Search and list users for administration. / Tìm kiếm và liệt kê user phục vụ quản trị. | Existing |
| `GET /api/users/:userId` | Get user | Xem chi tiết người dùng | Read one user's profile and assigned roles. / Xem hồ sơ và role của một user. | Existing |
| `POST /api/users` | Create user | Tạo người dùng | Create an administrative user account. / Tạo user từ màn quản trị. | Existing |
| `PATCH /api/users/:userId` | Update user | Cập nhật người dùng | Update user profile, department or allowed roles. / Cập nhật hồ sơ, department hoặc role được phép. | Existing |
| `PATCH /api/users/:userId/activate` | Change user active status | Kích hoạt/vô hiệu hóa người dùng | Activate or deactivate a user without deleting history. / Kích hoạt/vô hiệu hóa user mà không xóa lịch sử. | Existing |
| `GET /api/rbac/roles` | List available roles | Xem role có sẵn | List roles available for assignment. / Liệt kê role có thể gán. | Existing |
| `PUT /api/rbac/users/:userId/roles` | Replace user roles | Gán/gỡ role người dùng | Replace a user's assigned fixed roles. / Thay thế danh sách role cố định của user. | Existing |
| `GET /api/departments` | List departments | Xem phòng ban | List departments for asset and user assignment. / Liệt kê department phục vụ gán asset/user. | Existing |
| `POST /api/departments` | Create department | Tạo phòng ban | Add a department. / Thêm department. | Existing |
| `PATCH /api/departments/:departmentId` | Update department | Cập nhật phòng ban | Update a department. / Cập nhật department. | Existing |

## Not planned as public APIs / Không triển khai thành public API

- Role CRUD and permission-code CRUD: fixed system data managed by migration/seed in the current MVP. / CRUD role và permission code là dữ liệu hệ thống, quản lý qua migration/seed.
- QR inventory session, asset-location history, procurement and accounting. / Phiên kiểm kê QR, lịch sử vị trí, mua sắm và kế toán.
- Email, SMS, mobile push and scheduled notifications. / Email, SMS, push mobile và thông báo theo lịch.
