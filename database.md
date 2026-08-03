# Database – Hệ thống quản lý tài sản

Tài liệu này mô tả cấu trúc dữ liệu đã chốt cho hệ thống quản lý tài sản. Toàn bộ khóa chính nghiệp vụ hiện dùng `INT`; các timestamp dùng `DATETIME`.

## Quy ước và nguyên tắc migration

- Tên bảng dùng số nhiều, ví dụ `notifications`.
- Các cột thông tin legacy không thể xác định hợp lệ phải giữ `NULL`; không tự gán giá trị nghiệp vụ.
- `assets.status` chỉ phản ánh trạng thái hiện tại của tài sản. Trạng thái xử lý báo hỏng nằm ở `asset_issues.status`.
- Việc đồng thời cập nhật `asset_issues` và `assets` là transaction thuộc backend/service, không phải logic của migration.
- Trước mỗi `ALTER`, phải đối chiếu schema DB đang chạy. Không thêm lại một cột/index/FK đã tồn tại.
- Không đổi tên cột hoặc FK hiện có nếu migration không có bước rename rõ ràng. Ví dụ DB hiện dùng `borrow_histories.borrow_request_detail_id`, nên migration giữ nguyên tên này và unique index hiện có.
- Các cột legacy không thể backfill phải tiếp tục nullable trong migration đó; chỉ backend áp quy tắc bắt buộc cho dữ liệu mới.

## Danh mục và tài sản

### `brands`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh hãng. |
| `name` | `VARCHAR(30)`, unique | Tên hãng. |

### `asset_types`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh loại tài sản. |
| `name` | `VARCHAR(30)`, unique | Ví dụ: laptop, màn hình. |

### `asset_models`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh model. |
| `brand_id` | `INT`, FK → `brands.id` | Hãng của model. |
| `asset_type_id` | `INT`, FK → `asset_types.id` | Loại của model. |
| `name` | `VARCHAR(30)` | Tên model. |

Ràng buộc unique: (`brand_id`, `asset_type_id`, `name`).

### `assets`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh thiết bị vật lý. |
| `asset_model_id` | `INT`, FK → `asset_models.id` | Model của tài sản. |
| `serial_number` | `VARCHAR(100) NULL`, unique | Serial thiết bị nếu có. |
| `status` | `ENUM`, default `AVAILABLE` | Trạng thái hiện tại của tài sản. |
| `qr_code` | `VARCHAR(36)`, unique | Mã quét để tra cứu tài sản. |
| `image_url` | `VARCHAR(500) NULL` | URL ảnh đại diện/minh họa của tài sản. |
| `department_id` | `INT NULL`, FK → `departments.id` | Phòng ban đang quản lý tài sản. |
| `created_at` | `DATETIME` | Thời điểm tạo bản ghi. |

`assets.status` chỉ có các giá trị:

| Giá trị | Ý nghĩa |
|---|---|
| `AVAILABLE` | Có thể mượn. |
| `RESERVED` | Một dòng phiếu đã được duyệt đang giữ tài sản, nhưng chưa bàn giao. |
| `BORROWED` | Đã bàn giao và đang được mượn. |
| `DAMAGED` | Tài sản đã được xác nhận hỏng. |
| `IN_REPAIR` | Đang sửa chữa. |
| `RETIRED` | Ngừng sử dụng. |

Quan hệ `department_id` dùng `ON DELETE SET NULL`, `ON UPDATE CASCADE`.

Luồng mượn tài sản:

1. Nhiều phiếu/dòng chi tiết `PENDING` có thể cùng chọn một tài sản `AVAILABLE`.
2. Khi một dòng được duyệt, backend dùng transaction hoặc atomic conditional update để chuyển `AVAILABLE` → `RESERVED`. Chỉ một dòng được duyệt có thể giữ tài sản tại một thời điểm.
3. Khi Admin/Manager xác nhận bàn giao, chuyển `RESERVED` → `BORROWED`.
4. Nếu hủy dòng đã duyệt trước khi bàn giao, chuyển `RESERVED` → `AVAILABLE`.
5. Khi hoàn trả bình thường, chuyển `BORROWED` → `AVAILABLE`.

## Người dùng và phân quyền

### `departments`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh phòng ban. |
| `name` | `VARCHAR(30)`, unique | Tên phòng ban. |

### `users`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh người dùng. |
| `department_id` | `INT`, FK → `departments.id` | Phòng ban của người dùng. |
| `name` | `VARCHAR(30)` | Họ tên hiển thị. |
| `avatar_url` | `VARCHAR(500) NULL` | URL ảnh đại diện của user. |
| `password` | `VARCHAR(60)` | Hash mật khẩu hiện tại. |
| `email` | `VARCHAR(40)`, unique | Email đăng nhập/liên hệ. |
| `phone` | `VARCHAR(10)`, unique | Số điện thoại. |
| `is_active` | `BOOLEAN` | Tài khoản còn hoạt động hay không. |

### RBAC: `roles`, `permissions`, `user_roles`, `role_permissions`

| Bảng | Trường chính | Ý nghĩa |
|---|---|---|
| `roles` | `id`, `name` | Vai trò, ví dụ nhân viên, quản lý, quản trị viên. |
| `permissions` | `id`, `name`, `code` | Quyền thao tác; `code` là unique. |
| `user_roles` | `user_id`, `role_id` | Bảng nối N–N người dùng và vai trò; khóa chính ghép. |
| `role_permissions` | `role_id`, `permission_id` | Bảng nối N–N vai trò và quyền; khóa chính ghép. |

### `refresh_tokens`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `BIGINT`, PK | Định danh token. |
| `jti` | `VARCHAR(36)`, unique | Token identifier. |
| `user_id` | `INT`, FK → `users.id` | Chủ sở hữu token. |
| `family_id` | `VARCHAR(36)` | Nhóm token refresh. |
| `is_used`, `is_revoked` | `BOOLEAN` | Trạng thái sử dụng/thu hồi. |
| `expires_at`, `created_at` | `DATETIME` | Thời hạn và thời điểm tạo. |

## Mượn, duyệt, bàn giao và trả

### `borrow_requests`

Lưu thông tin chung của phiếu mượn; người tạo phiếu là `user_id`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh phiếu. |
| `user_id` | `INT`, FK → `users.id` | Người yêu cầu mượn. |
| `status` | `ENUM` | Trạng thái tổng hợp của phiếu. |
| `created_at` | `DATETIME` | Thời điểm tạo phiếu. |
| `note` | `TEXT NULL` | Ghi chú chung. |

Trạng thái tổng: `PENDING`, `PARTIALLY_APPROVED`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED`.

`COMPLETED` chỉ dùng khi toàn bộ tài sản đã được duyệt trong phiếu đã hoàn trả. Không lưu `approved_by` hoặc `approved_at` ở bảng này.

### `borrow_request_details`

Lưu từng tài sản trong phiếu và quyết định duyệt của tài sản đó.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh dòng chi tiết. |
| `borrow_request_id` | `INT`, FK → `borrow_requests.id` | Phiếu chứa dòng thiết bị. |
| `asset_id` | `INT`, FK → `assets.id` | Tài sản được yêu cầu. |
| `approval_status` | `VARCHAR(30)`, default `PENDING` | Trạng thái duyệt của dòng thiết bị. |
| `approved_by` | `INT NULL`, FK → `users.id` | Người quản lý/admin đã duyệt hoặc từ chối. |
| `approved_at` | `DATETIME NULL` | Thời điểm xử lý. |
| `rejection_reason` | `TEXT NULL` | Lý do từ chối. |
| `note` | `TEXT NULL` | Ghi chú của dòng chi tiết. |
| `expected_return_date` | `DATETIME` | Ngày dự kiến trả. |

`approval_status` chỉ gồm `PENDING`, `APPROVED`, `REJECTED`; không có `HANDED_OVER` hoặc `RETURNED`.

Business Rule:

- `PENDING`: `approved_by`, `approved_at`, `rejection_reason` đều `NULL`.
- `APPROVED`: `approved_by`, `approved_at` có giá trị; `rejection_reason` là `NULL`.
- `REJECTED`: cả ba trường có giá trị đối với dữ liệu mới. Legacy không có lý do từ chối vẫn giữ `rejection_reason = NULL`.

Ràng buộc unique: (`borrow_request_id`, `asset_id`).

### `borrow_histories`

Mỗi dòng chi tiết có tối đa một lịch sử bàn giao/trả.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh lịch sử. |
| `borrow_request_detail_id` | `INT`, FK → `borrow_request_details.id`, unique | Dòng thiết bị được bàn giao/trả. |
| `handed_over_by` | `INT NULL`, FK → `users.id` | Admin/Manager xác nhận bàn giao. Bắt buộc với dữ liệu mới. |
| `borrow_date` | `DATETIME` | Thời điểm bàn giao thực tế. |
| `received_by` | `INT NULL`, FK → `users.id` | Admin/Manager tiếp nhận khi nhân viên trả. |
| `return_date` | `DATETIME NULL` | Thời điểm hoàn trả thực tế. |
| `return_condition` | `VARCHAR(100) NULL` | Tình trạng tài sản khi trả. |

Người mượn được truy qua `borrow_request_details` → `borrow_requests.user_id`, không lưu lặp ở bảng này.

Business Rule:

- Khi `return_date IS NULL`, `received_by` và `return_condition` phải `NULL`.
- Khi có `return_date`, hai trường trên phải có giá trị đối với dữ liệu mới.

## Báo hỏng và sửa chữa

### `asset_issues`

Đây là tên mới của `repair_logs`. Bảng lưu báo hỏng từ lúc ghi nhận đến khi xử lý/sửa chữa hoàn tất.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh sự cố. |
| `asset_id` | `INT`, FK → `assets.id` | Tài sản gặp sự cố. |
| `reported_by` | `INT NULL`, FK → `users.id` | Người báo hỏng. Nullable để giữ dữ liệu legacy chưa rõ người báo. |
| `description` | `TEXT NULL` | Mô tả sự cố. Nullable cho legacy. |
| `status` | `VARCHAR(30) NULL`, default `REPORTED` | Trạng thái xử lý sự cố. |
| `handled_by` | `INT NULL`, FK → `users.id` | Người phụ trách xử lý. |
| `repair_provider` | `VARCHAR(255) NULL` | Đơn vị/cá nhân sửa chữa. |
| `start_date`, `end_date` | `DATETIME NULL` | Thời gian xử lý/sửa chữa. |
| `cost` | `DECIMAL(12,2) NULL` | Chi phí sửa chữa. |
| `result`, `note` | `TEXT NULL` | Kết quả và ghi chú. |
| `created_at`, `updated_at` | `DATETIME NULL` | Metadata; bản ghi legacy thiếu dữ liệu giữ `NULL`. |

Trạng thái: `REPORTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `IN_REPAIR`, `COMPLETED`, `FAILED`.

Luồng: `REPORTED` → `REJECTED`/`CANCELLED` hoặc `CONFIRMED` → `IN_REPAIR` → `COMPLETED`/`FAILED`.

Không tự gán `reported_by = handled_by` khi backfill.

## Thông báo

### `notifications`

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | `INT`, PK | Định danh thông báo. |
| `recipient_user_id` | `INT`, FK → `users.id` | Người nhận. |
| `notification_type` | `VARCHAR(50)` | Loại thông báo. |
| `title` | `VARCHAR(255)` | Tiêu đề. |
| `message` | `TEXT` | Nội dung. |
| `related_entity_type` | `VARCHAR(50) NULL` | Loại đối tượng liên quan, ví dụ `BORROW_REQUEST`. |
| `related_entity_id` | `INT NULL` | ID đối tượng liên quan, ví dụ `25`. |
| `is_read` | `BOOLEAN`, default `FALSE` | Trạng thái đã đọc. |
| `read_at` | `DATETIME NULL` | Thời điểm đọc. |
| `created_at` | `DATETIME`, default current timestamp | Thời điểm tạo. |

Chỉ `recipient_user_id` là FK. Cặp `related_entity_type` và `related_entity_id` là tham chiếu logic, không tạo FK.

Index: (`recipient_user_id`, `is_read`) và (`recipient_user_id`, `created_at`). Nếu bảng cũ tên `Notification` tồn tại, migration rename thành `notifications`; nếu cột khóa chính tên `notification_id`, migration rename thành `id`.

## Tóm tắt quan hệ

| Quan hệ | Lực lượng |
|---|---:|
| `brands` → `asset_models`; `asset_types` → `asset_models`; `asset_models` → `assets` | 1–N |
| `departments` → `users`; `departments` → `assets` | 1–N |
| `users` ↔ `roles` qua `user_roles`; `roles` ↔ `permissions` qua `role_permissions` | N–N |
| `users` → `borrow_requests` → `borrow_request_details` | 1–N → 1–N |
| `assets` → `borrow_request_details` | 1–N theo thời gian |
| `borrow_request_details` → `borrow_histories` | 1–0..1 |
| `assets` → `asset_issues`; `users` → `asset_issues` qua `reported_by`/`handled_by` | 1–N |
| `users` → `notifications` | 1–N |
