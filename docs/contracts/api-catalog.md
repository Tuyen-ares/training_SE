# BigIn Asset — API Catalog / Danh mục API

> Scope: full project catalogue for F01–F08. This is a short inventory, not a
> detailed API contract. Each planned endpoint needs its own approved DTO,
> validation, permission, error and transaction contract before implementation.
>
> Status: **Existing** = route is registered today; **Planned** = intended API;
> **Deferred** = intentionally outside the current implementation slice.
>
> Synchronization rule: when an API is added, changed or removed, update this
> catalogue, `apps/backend/openapi.yaml` and the relevant detailed contract in
> the same task, then verify them against the registered route/controller.

## F01 — Authentication & Access / Xác thực và truy cập

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `POST /api/auth/login` | Sign in | Đăng nhập | Authenticate an active user and issue a session. / Xác thực user active và cấp phiên. | Existing |
| `POST /api/auth/refresh` | Refresh session | Làm mới phiên | Exchange a valid refresh token for a new session. / Làm mới phiên từ refresh token hợp lệ. | Existing |
| `POST /api/auth/logout` | Sign out | Đăng xuất | Revoke the current refresh capability. / Thu hồi khả năng refresh của phiên hiện tại. | Existing |
| `POST /api/registration-requests` | Submit registration request | Gửi yêu cầu đăng ký | Create a pending request without user/session; pending email/phone uniqueness is DB-safe. / Tạo request chờ duyệt, không tạo user/session; unique pending email/phone ở DB. | Existing |
| `GET /api/registration-requests` | List registration requests | Xem danh sách yêu cầu đăng ký | Search/filter paginated requests for `user_registration.review`. / Search/filter request cho reviewer. | Existing |
| `GET /api/registration-requests/:requestId` | Get registration request | Xem chi tiết yêu cầu đăng ký | Read applicant and review audit. / Xem applicant và audit xét duyệt. | Existing |
| `POST /api/registration-requests/:requestId/approve` | Approve registration request | Duyệt yêu cầu đăng ký | Atomically create user/userCode, department, initial roles, link createdUserId and clear hash. / Tạo user và liên kết/clear hash nguyên tử. | Existing |
| `POST /api/registration-requests/:requestId/reject` | Reject registration request | Từ chối yêu cầu đăng ký | Reject with optional reason and clear hash/pending keys. / Reject reason tùy chọn và clear hash/pending keys. | Existing |

## F02 — Asset Management / Quản lý tài sản

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/assets` | List assets | Xem danh sách thiết bị | Search (including immutable asset code), filter and paginate assets. / Tìm kiếm (gồm mã asset bất biến), lọc và phân trang thiết bị. | Existing |
| `GET /api/assets/:assetId` | Get asset detail | Xem chi tiết thiết bị | Read the full asset detail, immutable asset code and allowed actions. / Xem chi tiết asset, mã asset bất biến và action được phép. | Existing |
| `POST /api/assets` | Create asset | Tạo thiết bị | Add an asset; optional `imageMediaId` is atomically claimed as the one primary image; legacy `imageUrl` remains supported. / Tạo asset; `imageMediaId` optional được claim/link nguyên tử; vẫn hỗ trợ `imageUrl` legacy. | Existing |
| `PATCH /api/assets/:assetId` | Update asset | Cập nhật thiết bị | Update editable asset information and optional primary `imageMediaId`; asset code cannot be changed. / Cập nhật thông tin và ảnh chính optional; không sửa mã asset. | Existing |
| `POST /api/assets/:assetId/retire` | Retire asset | Ngừng sử dụng thiết bị | Retire an eligible asset through a dedicated lifecycle action. / Ngừng sử dụng asset đủ điều kiện bằng action riêng. | Existing |
| `GET /api/assets/by-qr/:qrCode` | Look up asset by QR | Tra cứu thiết bị bằng QR | Resolve the immutable `qr_code` extracted from the frontend QR URL to the asset detail. / Tra `qr_code` bất biến được trích xuất từ frontend QR URL để mở chi tiết asset. | Existing |
| `GET /api/brands` | List brands | Xem danh sách hãng | Read asset brands. / Xem hãng thiết bị. | Existing |
| `POST /api/brands` | Create brand | Tạo hãng | Add a brand to the catalogue. / Thêm hãng vào danh mục. | Existing |
| `PATCH /api/brands/:brandId` | Update brand | Cập nhật hãng | Rename/update a brand. / Cập nhật hãng. | Existing |
| `GET /api/asset-types` | List asset types | Xem loại thiết bị | Read asset types. / Xem loại thiết bị. | Existing |
| `POST /api/asset-types` | Create asset type | Tạo loại thiết bị | Add a type and server-derived unique normalized code prefix. / Thêm type và prefix mã chuẩn hóa duy nhất do server sinh. | Existing |
| `PATCH /api/asset-types/:typeId` | Update asset type | Cập nhật loại thiết bị | Rename/update type and its future code prefix; issued codes remain immutable. / Đổi type/prefix cho mã tương lai; mã đã cấp giữ nguyên. | Existing |
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
| `GET /api/borrow-request-details/review-queue` | List review queue | Xem hàng đợi duyệt | List requests/details awaiting review within the permitted scope. / Liệt kê phiếu/detail chờ duyệt trong phạm vi được cấp. | Existing |
| `GET /api/borrow-request-details/review-queue/:requestId` | Get review request detail | Xem chi tiết phiếu cần duyệt | Read one request for review within the permitted scope. / Xem một phiếu để xử lý trong phạm vi được cấp. | Existing |
| `POST /api/borrow-request-details/:detailId/approve` | Approve borrow detail | Duyệt một thiết bị trong phiếu | Atomically approve a pending detail and reserve its asset. / Duyệt detail pending và giữ chỗ asset một cách nguyên tử. | Existing |
| `POST /api/borrow-request-details/:detailId/reject` | Reject borrow detail | Từ chối một thiết bị trong phiếu | Reject a pending detail with a reason. / Từ chối detail pending kèm lý do. | Existing |
| `POST /api/borrow-requests/:requestId/approve-all` | Approve all eligible details | Duyệt tất cả detail đủ điều kiện | Process pending details with partial-success results. / Xử lý nhiều detail pending theo kết quả partial success. | Existing |

## F05 — Handover, Return & Borrow History / Bàn giao, hoàn trả và lịch sử mượn

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/borrow-request-details/handover-queue` | List pending handovers | Xem hàng đợi bàn giao | List `APPROVED` + `RESERVED` details without a borrow history for `asset.checkout`; does not require `borrow_request.view_all` or `borrow_history.view_all`. / Liệt kê detail đã duyệt, asset reserved chưa bàn giao cho quyền `asset.checkout`; không yêu cầu quyền xem toàn bộ request/history. | Existing |
| `POST /api/borrow-request-details/:detailId/handover` | Confirm handover | Xác nhận bàn giao | Mark a reserved asset as handed over, create its borrow history and optionally claim `mediaIds` as HANDOVER evidence atomically. / Xác nhận bàn giao, tạo history và claim evidence HANDOVER optional nguyên tử. | Existing |
| `GET /api/borrow-histories/return-queue` | List pending returns | Xem hàng đợi hoàn trả | List unreturned histories for `asset.checkin`; does not require `borrow_request.view_all` or `borrow_history.view_all`. / Liệt kê history chưa trả cho quyền `asset.checkin`; không yêu cầu quyền xem toàn bộ request/history. | Existing |
| `GET /api/borrow-histories/current` | List my current borrows | Xem tài sản đang mượn | List assets currently borrowed by the current user. / Liệt kê asset user hiện tại đang mượn. | Existing |
| `POST /api/borrow-histories/:historyId/return` | Confirm return | Xác nhận hoàn trả | Record a normal return, make the asset available and optionally claim `mediaIds` as RETURN evidence atomically. / Ghi nhận trả và claim evidence RETURN optional nguyên tử. | Existing |
| `GET /api/borrow-histories/me` | List my borrow history | Xem lịch sử mượn của tôi | List the current user's completed and open borrow history. / Xem lịch sử mượn đã/chưa hoàn trả của user hiện tại. | Existing |
| `GET /api/borrow-histories` | List all borrow history | Xem toàn bộ lịch sử mượn | Search history across users within the permitted scope. / Tra cứu lịch sử của mọi user trong phạm vi quyền. | Existing |
| `GET /api/borrow-histories/:historyId` | Get borrow history detail | Xem chi tiết lịch sử mượn | Read request reason, approval, handover and return metadata within the user's effective history scope. / Xem lý do mượn, duyệt, bàn giao và hoàn trả trong phạm vi lịch sử được cấp. | Existing |
| `POST /api/borrow-histories/:historyId/return-damaged` | Return damaged asset | Xác nhận trả thiết bị hỏng | Return a damaged asset, create the linked confirmed issue and optionally claim RETURN `mediaIds` atomically; response includes `issueId`. / Trả asset hỏng, tạo issue và claim evidence RETURN optional nguyên tử; response có `issueId`. | Existing |

## F06 — Asset Issues & Repair / Sự cố và sửa chữa tài sản

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `POST /api/assets/:assetId/report-damaged` | Report asset issue | Báo sự cố thiết bị | Create a reported issue without changing asset status. / Tạo issue reported mà không đổi trạng thái asset. | Existing |
| `GET /api/asset-issues` | List asset issues | Xem danh sách sự cố | Search and filter issues the user may view. / Tìm kiếm và lọc issue user được phép xem. | Existing |
| `GET /api/asset-issues/:issueId` | Get asset issue detail | Xem chi tiết sự cố | Read an issue and its repair information. / Xem issue và thông tin sửa chữa. | Existing |
| `POST /api/asset-issues/:issueId/confirm` | Confirm asset issue | Xác minh sự cố | Confirm a `REPORTED` issue when its asset is `AVAILABLE` or `BORROWED`, then mark the asset damaged. / Xác nhận issue `REPORTED` khi asset `AVAILABLE` hoặc `BORROWED`, rồi chuyển asset sang damaged. | Existing |
| `POST /api/asset-issues/:issueId/reject` | Reject asset issue | Từ chối sự cố | Reject a `REPORTED` issue with an optional note; asset status is unchanged. / Từ chối issue `REPORTED` với note tùy chọn; không đổi trạng thái asset. | Existing |
| `POST /api/asset-issues/:issueId/start-repair` | Start repair | Bắt đầu sửa chữa | Start repair for a confirmed damaged issue and move the asset into repair. / Bắt đầu sửa issue confirmed/damaged và chuyển asset sang in repair. | Existing |
| `PATCH /api/asset-issues/:issueId/repair` | Update repair progress | Cập nhật quá trình sửa | Update vendor, timing, cost, result and notes. `vendorId` omitted preserves; number/null changes it and requires both `asset_issue.update` and `vendor.view`. / Cập nhật vendor, thời gian, chi phí, kết quả và ghi chú; set/clear vendor cần đồng thời `asset_issue.update` và `vendor.view`. | Existing |
| `POST /api/asset-issues/:issueId/complete` | Complete repair | Hoàn tất sửa chữa | Complete an in-progress repair, optionally claim `mediaIds` as AFTER_REPAIR evidence and move the asset to available. / Hoàn tất sửa, claim evidence optional và đưa asset về available. | Existing |
| `POST /api/asset-issues/:issueId/fail` | Fail repair | Ghi nhận sửa chữa thất bại | Record a failed repair and move the asset to damaged; never retire it automatically. / Ghi nhận sửa thất bại và chuyển asset về damaged; không tự retire. | Existing |

## Vendor Management / Quản lý vendor dùng chung

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/vendors` | List vendors | Xem danh sách vendor | Search, paginate and filter active/inactive vendors; requires `vendor.view`. / Tìm kiếm, phân trang và lọc vendor active/inactive; cần `vendor.view`. | New |
| `GET /api/vendors/:vendorId` | Get vendor detail | Xem chi tiết vendor | Read vendor contact data; requires `vendor.view`. / Xem contact vendor; cần `vendor.view`. | New |
| `POST /api/vendors` | Create vendor | Tạo vendor | Create an active shared vendor master record; requires `vendor.create`. / Tạo vendor dùng chung ở trạng thái active; cần `vendor.create`. | New |
| `PATCH /api/vendors/:vendorId` | Update vendor information | Cập nhật thông tin vendor | Update name/contact/address only; requires `vendor.update`. `isActive` is rejected here. / Chỉ sửa name/contact/address; cần `vendor.update`. `isActive` bị từ chối ở endpoint này. | Existing |
| `PATCH /api/vendors/:vendorId/status` | Change vendor active status | Kích hoạt/vô hiệu hóa vendor | Set `isActive` to `true` or `false`; requires `vendor.manage_status`. Deactivation preserves history. / Đổi `isActive`; cần `vendor.manage_status`, deactivate giữ lịch sử. | Existing |

## F07 — Notifications / Thông báo

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/notifications` | List my notifications | Xem thông báo của tôi | List the current user's notifications in time order. / Liệt kê thông báo của user hiện tại theo thời gian. | Existing |
| `GET /api/notifications/unread-count` | Get unread notification count | Xem số thông báo chưa đọc | Return the count of unread notifications for the current user. / Trả số thông báo chưa đọc của user hiện tại. | Existing |
| `PATCH /api/notifications/:notificationId/read` | Mark notification as read | Đánh dấu thông báo đã đọc | Mark one owned notification as read. / Đánh dấu một thông báo thuộc user là đã đọc. | Existing |
| `PATCH /api/notifications/read-all` | Mark all notifications as read | Đánh dấu tất cả thông báo đã đọc | Mark all current-user notifications as read. / Đánh dấu toàn bộ thông báo của user hiện tại đã đọc. | Existing |

## F08 — Administration / Quản trị người dùng và phân quyền

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `GET /api/users/me` | Get my profile | Xem profile của tôi | Read the authenticated user's safe profile; media avatar URL takes precedence over legacy URL. / Xem profile an toàn, ưu tiên avatar media. | Existing |
| `PATCH /api/users/me` | Update my profile | Cập nhật profile của tôi | Update name, phone and optional `avatarMediaId` (legacy URL remains fallback) only. / Chỉ cập nhật name, phone và avatar media optional. | Existing |
| `PATCH /api/users/me/password` | Change my password | Đổi mật khẩu của tôi | Verify the current password, save a new hash and revoke refresh sessions. / Xác minh mật khẩu cũ, lưu hash mới và thu hồi refresh session. | Existing |
| `GET /api/users` | List users | Xem danh sách người dùng | Search and list users for administration. / Tìm kiếm và liệt kê user phục vụ quản trị. | Existing |
| `GET /api/users/:userId` | Get user | Xem chi tiết người dùng | Read one user's profile and assigned roles. / Xem hồ sơ và role của một user. | Existing |
| `POST /api/users` | Create user | Tạo người dùng | Create an administrative user account with optional atomically claimed `avatarMediaId`. / Tạo user với avatar media optional được claim nguyên tử. | Existing |
| `PATCH /api/users/:userId` | Update user information | Cập nhật thông tin người dùng | Update profile, department, allowed roles and optional `avatarMediaId`; status is not changed here. / Cập nhật hồ sơ, role và avatar media; không đổi status. | Existing |
| `PATCH /api/users/:userId/status` | Change user active status | Kích hoạt/vô hiệu hóa người dùng | Set `isActive` to `true` or `false` without deleting history; requires `user.manage_status` for both directions. / Gửi `isActive` là `true` hoặc `false`; cả hai chiều cần `user.manage_status`. | Existing |
| `GET /api/rbac/roles` | List roles | Xem role | List role type and permission/user counts. / Liệt kê type và count permission/user. | Existing |
| `GET /api/rbac/roles/:roleId` | Get role detail | Xem chi tiết role | Read role and its described permission set. / Xem role và permission descriptions. | Existing |
| `POST /api/rbac/roles` | Create role | Tạo role | Create a custom role with a non-empty initial permission set. / Tạo custom role với permission set không rỗng. | Existing |
| `PATCH /api/rbac/roles/:roleId` | Rename role | Đổi tên role | Rename a custom role; system names are protected. / Rename custom role; bảo vệ system role. | Existing |
| `PUT /api/rbac/roles/:roleId/permissions` | Replace role permissions | Thay permission của role | Atomically replace the set and enforce essential-admin invariant. / Replace-set và giữ essential-admin invariant. | Existing |
| `GET /api/rbac/permissions` | List permissions | Xem permission | Read permission codes and English descriptions; no write API. / Đọc code và description; không có write API. | Existing |
| `PUT /api/rbac/users/:userId/roles` | Replace user roles | Gán/gỡ role người dùng | Replace a non-empty user role set with lockout protection. / Replace role set không rỗng và chống mất quyền quản trị. | Existing |
| `GET /api/departments` | List departments | Xem phòng ban | List active and inactive departments for asset and user assignment; requires `department.view` or `user_registration.review`. / Liệt kê department active/inactive; cần `department.view` hoặc `user_registration.review`. | Existing |
| `POST /api/departments` | Create department | Tạo phòng ban | Add a department. / Thêm department. | Existing |
| `PATCH /api/departments/:departmentId` | Update department information | Cập nhật thông tin phòng ban | Update name only; requires `department.update`, and `isActive` is rejected. / Chỉ sửa name; cần `department.update`, `isActive` bị từ chối. | Existing |
| `PATCH /api/departments/:departmentId/status` | Change department active status | Kích hoạt/vô hiệu hóa phòng ban | Set `isActive` to `true` or `false`; requires `department.manage_status`. Inactive departments retain links/history but cannot be selected for new assignments. / Đổi status; department inactive giữ liên kết/lịch sử nhưng không được chọn cho assignment mới. | Existing |

### Asset identity response note

The nested asset objects returned by borrow request detail/review detail,
handover queue, borrow history list/detail and asset issue list/detail now expose
the immutable `assetCode` additively. Existing `qrCode`, serial and image fields
remain unchanged for compatibility and QR workflows; no route, permission or
business transition changes are implied by this response-field addition.

## Media Core / Ảnh và evidence

| API | English name | Tên tiếng Việt | Purpose / Mục đích | Status |
| --- | --- | --- | --- | --- |
| `POST /api/media/presign` | Presign media upload | Cấp presigned upload | Validate purpose/permission/MIME/size, create a PENDING media row and return a presigned PUT with signed `Content-Type`, immutable `Cache-Control` and `If-None-Match: *`; never returns AWS credentials or public URL. / Validate và cấp PUT trực tiếp S3. | Existing |
| `POST /api/media/:mediaId/complete` | Complete media upload | Hoàn tất upload | Verify ownership and `HeadObject` metadata, transition PENDING to READY and return the CloudFront URL; READY retry is idempotent. / Verify object và chuyển READY. | Existing |
| `DELETE /api/media/:mediaId` | Cancel media upload | Hủy upload | Uploader-only cancel for PENDING or READY media while unlinked. The service locks/rechecks the row and typed/FK relations in a bounded transaction, aborts DeleteObject after 5 seconds, and returns `409 MEDIA_ALREADY_LINKED` or retryable `503 MEDIA_STORAGE_UNAVAILABLE` when applicable. / Uploader hủy media PENDING/READY chưa claim với row lock và timeout rõ ràng. | Existing |

## Not planned as public APIs / Không triển khai thành public API

- Role delete and permission-code CRUD are not public APIs. / Delete role và CRUD permission code không có public API.
- User, vendor and department delete are not public APIs; their lifecycle status is changed through the dedicated `*.manage_status` endpoints. / Không có API delete cho user, vendor và department; status dùng endpoint `*.manage_status` riêng.
- QR inventory session, asset-location history, procurement and accounting. / Phiên kiểm kê QR, lịch sử vị trí, mua sắm và kế toán.
- Email, SMS, mobile push and scheduled notifications. / Email, SMS, push mobile và thông báo theo lịch.
