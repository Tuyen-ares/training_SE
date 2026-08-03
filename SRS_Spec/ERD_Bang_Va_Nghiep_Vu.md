# Giải thích bảng dữ liệu và nghiệp vụ hệ thống quản lý tài sản

> Phạm vi tài liệu này chưa bao gồm bảng `notifications`.

## 1. Kiểm kê là gì?

Kiểm kê là việc đối chiếu **danh sách tài sản hệ thống dự kiến có** với **tài sản thực tế quét được tại một thời điểm và vị trí cụ thể**.

Ví dụ: Quản lý tạo đợt kiểm kê phòng IT. Hệ thống chốt danh sách 20 tài sản dự kiến ở phòng IT. Người kiểm kê dùng camera hoặc máy quét để quét QR từng thiết bị. Kết quả có thể là:

- `Khớp`: tài sản nằm đúng trong danh sách và đúng vị trí.
- `Chưa quét`: có trong danh sách dự kiến nhưng chưa tìm thấy/quét được.
- `Sai vị trí`: tài sản được quét nhưng đang ở vị trí khác.
- `Ngoài danh sách`: tài sản được quét nhưng không thuộc phạm vi kiểm kê.
- `Hư hỏng`: phát hiện tình trạng hư hỏng khi kiểm kê.

`Chưa quét` không đồng nghĩa tài sản bị mất. Người quản lý phải xác minh trước khi thay đổi vị trí hoặc trạng thái tài sản.

## 2. Các bảng danh mục và phân quyền

| Bảng | Ý nghĩa | Hỗ trợ nghiệp vụ |
|---|---|---|
| `users` | Lưu tài khoản người dùng: mã nhân viên, họ tên, email, mật khẩu mã hóa, trạng thái hoạt động. | Đăng nhập; xác định người tạo phiếu mượn, người duyệt, người báo hỏng và người kiểm kê. |
| `roles` | Danh sách vai trò: Nhân viên, Người quản lý, Quản trị viên. | Phân quyền theo vai trò. |
| `permissions` | Danh sách quyền chi tiết, ví dụ `VIEW_OWN_BORROW_REQUEST`, `VIEW_ALL_BORROW_REQUEST`, `APPROVE_BORROW_REQUEST`. | Cho phép cấu hình quyền thay vì kiểm tra cứng trong mã nguồn. |
| `role_permissions` | Bảng liên kết quyền với vai trò. | Nhân viên chỉ xem phiếu của mình; Quản lý và Quản trị viên xem toàn bộ, duyệt/từ chối phiếu. |
| `user_roles` | Bảng liên kết người dùng với vai trò. | Dùng khi một người có thể có nhiều vai trò. Nếu phiên bản hiện tại quy định mỗi người chỉ có một vai trò, nên dùng `users.role_id` hoặc đặt unique cho `user_id`. |
| `departments` | Phòng ban mà người dùng thuộc về. | Phân loại người dùng và làm dữ liệu tham chiếu. |
| `locations` | Vị trí vật lý: tầng, phòng, kho, khu vực. | Biết tài sản đang ở đâu và xử lý kiểm kê sai vị trí. Bảng này cần bổ sung. |

## 3. Các bảng quản lý tài sản

| Bảng | Ý nghĩa | Hỗ trợ nghiệp vụ |
|---|---|---|
| `asset_types` | Loại tài sản: laptop, màn hình, bàn phím. | Phân loại tài sản. |
| `brands` | Hãng sản xuất. | Phân loại model thiết bị. |
| `asset_models` | Model tài sản, liên kết với loại và hãng. | Ví dụ: Dell Latitude 5440 thuộc loại Laptop và hãng Dell. |
| `assets` | Mỗi dòng là một tài sản vật lý riêng biệt. | Tra cứu, quét QR, mượn/trả, báo hỏng, sửa chữa và kiểm kê. |
| `asset_histories` | Lịch sử các thay đổi quan trọng của tài sản. | Truy vết trạng thái, vị trí, người đang giữ và các thao tác thay đổi. Bảng này cần bổ sung. |

### Trường nên có trong `assets`

```text
id                    PK
asset_code            Mã tài sản, unique
model_id              FK -> asset_models
location_id           FK -> locations
status                Khả dụng / Đang mượn / Hư hỏng / Đang sửa chữa / Ngừng sử dụng
condition             Tình trạng thực tế
qr_code               Unique, dùng để quét
serial_number         Unique khi có giá trị
created_at, updated_at
```

## 4. Các bảng mượn, duyệt, bàn giao và trả tài sản

| Bảng | Ý nghĩa | Hỗ trợ nghiệp vụ |
|---|---|---|
| `borrow_requests` | Phiếu mượn tổng do Nhân viên tạo. | Lưu người yêu cầu, mục đích, ngày tạo và trạng thái tổng quan. |
| `borrow_request_details` | Mỗi dòng là một tài sản trong phiếu mượn. | Một phiếu có thể mượn nhiều tài sản và duyệt/từ chối từng tài sản. |
| `borrow_request_item_events` | Lịch sử sự kiện của từng tài sản trong phiếu mượn. | Lưu tạo yêu cầu, duyệt, từ chối, bàn giao, trả, hủy; biết ai thực hiện và khi nào. Nên dùng thay cho `borrow_histories` hiện tại. |

### `borrow_requests`: thông tin chung của phiếu

```text
id                    PK
requester_id          FK -> users
purpose               Mục đích mượn
requested_at          Thời điểm tạo phiếu
status                Trạng thái tổng quan: Nháp / Chờ duyệt / Duyệt một phần / Đã duyệt / Từ chối / Đã hủy / Hoàn tất
note
```

Nhân viên xem phiếu của mình bằng điều kiện `requester_id = user đang đăng nhập`.

### `borrow_request_details`: thông tin từng thiết bị

```text
id                    PK
borrow_request_id     FK -> borrow_requests
asset_id              FK -> assets
expected_return_date  Ngày trả dự kiến
status                Chờ duyệt / Đã duyệt / Từ chối / Đã bàn giao / Đã trả / Hủy
approved_by           FK -> users, nullable
approved_at           Datetime, nullable
rejection_reason      Lý do từ chối, nullable
handed_over_by        FK -> users, nullable
handed_over_at        Datetime, nullable
condition_out         Tình trạng khi giao
received_by           FK -> users, nullable
received_at           Datetime, nullable
condition_in          Tình trạng khi trả
return_note           Ghi chú khi trả
```

Thông tin duyệt phải nằm ở bảng chi tiết, không nên chỉ đặt ở `borrow_requests`, vì một phiếu có thể được duyệt một phần.

### Quyền xem và duyệt phiếu

| Vai trò | Xem phiếu mượn | Duyệt/từ chối |
|---|---|---|
| Nhân viên | Chỉ phiếu do chính mình tạo | Không |
| Người quản lý | Toàn bộ phiếu được gửi | Có |
| Quản trị viên | Toàn bộ phiếu được gửi | Có |

## 5. Các bảng báo hỏng và sửa chữa

| Bảng | Ý nghĩa | Hỗ trợ nghiệp vụ |
|---|---|---|
| `damage_reports` | Phiếu báo hỏng do Nhân viên tạo. | Lưu ai báo, tài sản nào hỏng, mô tả lỗi, thời điểm và kết quả xác minh. |
| `repair_logs` | Quá trình sửa chữa của một báo hỏng/tài sản. | Lưu người xử lý, đơn vị sửa chữa, thời gian, chi phí và kết quả. |

### `damage_reports`

```text
id                    PK
asset_id              FK -> assets
reported_by           FK -> users
description           Mô tả sự cố
reported_at
status                Mới / Đã xác minh / Từ chối / Đang sửa / Hoàn tất
verified_by           FK -> users, nullable
verified_at           Datetime, nullable
rejection_reason      Text, nullable
```

### `repair_logs`

```text
id                    PK
damage_report_id      FK -> damage_reports
asset_id              FK -> assets
handled_by_id         FK -> users
vendor                Đơn vị sửa chữa, nullable
start_date
end_date              Nullable
cost                  Nullable
status                Đang sửa / Hoàn tất / Không thể sửa
result                Kết quả xử lý, nullable
note
```

## 6. Các bảng kiểm kê QR

| Bảng | Ý nghĩa | Hỗ trợ nghiệp vụ |
|---|---|---|
| `inventory_sessions` | Một đợt kiểm kê. | Xác định tên đợt, phạm vi, người tạo, thời gian và trạng thái đóng/mở. |
| `inventory_items` | Danh sách tài sản dự kiến trong từng đợt và kết quả thực tế. | Lưu kết quả quét QR, vị trí quét, người quét, chênh lệch và ghi chú xác minh. |

### `inventory_sessions`

```text
id                    PK
name                  Tên đợt kiểm kê
scope_type            Toàn trụ sở / Theo vị trí
location_id           FK -> locations, nullable
created_by            FK -> users
started_at
closed_at             Nullable
status                Nháp / Đang thực hiện / Đã đóng
```

### `inventory_items`

```text
id                    PK
inventory_session_id  FK -> inventory_sessions
asset_id              FK -> assets
expected_location_id  FK -> locations
result_status         Chưa quét / Khớp / Sai vị trí / Ngoài danh sách / Hư hỏng
scanned_by            FK -> users, nullable
scanned_at            Nullable
scanned_location_id   FK -> locations, nullable
verification_note     Nullable
verified_by           FK -> users, nullable
```

Khi bắt đầu kiểm kê, hệ thống tạo các dòng `inventory_items` từ danh sách tài sản dự kiến. Khi quét QR, hệ thống tìm đúng `asset_id` và cập nhật kết quả của dòng tương ứng.

## 7. Quan hệ quan trọng cần nhớ

```text
users 1 --- n borrow_requests
borrow_requests 1 --- n borrow_request_details
assets 1 --- n borrow_request_details
borrow_request_details 1 --- n borrow_request_item_events

assets 1 --- n damage_reports
damage_reports 1 --- n repair_logs

inventory_sessions 1 --- n inventory_items
assets 1 --- n inventory_items
locations 1 --- n assets
```

## 8. Kết luận

ERD hiện tại đã có nền tảng cho người dùng, phân quyền, tài sản, phiếu mượn và lịch sử mượn/trả. Để đáp ứng đầy đủ nghiệp vụ, cần bổ sung tối thiểu:

- `locations`
- `asset_histories`
- `damage_reports`
- `inventory_sessions`
- `inventory_items`
- Cấu trúc chi tiết duyệt/bàn giao/trả trong `borrow_request_details`
- Lịch sử sự kiện `borrow_request_item_events`

