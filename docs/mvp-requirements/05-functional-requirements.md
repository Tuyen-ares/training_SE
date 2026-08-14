# Functional Requirements

## F01 – Authentication & Access

| ID | Yêu cầu chức năng |
|---|---|
| FR-F01-01 | Hệ thống phải cho phép user đăng nhập bằng thông tin xác thực hợp lệ. |
| FR-F01-02 | Hệ thống phải từ chối đăng nhập và refresh đối với user inactive. |
| FR-F01-03 | Hệ thống phải cho phép làm mới phiên bằng refresh token hợp lệ. |
| FR-F01-04 | Hệ thống phải cho phép user logout và chấm dứt khả năng refresh của phiên. |
| FR-F01-05 | Hệ thống phải kiểm tra permission trước khi thực hiện hành vi được bảo vệ. |
| FR-F01-06 | Hệ thống phải cho phép người dùng gửi yêu cầu đăng ký với thông tin cơ bản mà không tự chọn role hoặc department. |
| FR-F01-07 | Hệ thống phải cho phép user có permission `user_registration.review` duyệt hoặc từ chối yêu cầu đăng ký; khi duyệt, hệ thống tạo tài khoản active và gán role/department theo quyết định review. |
| FR-F01-08 | Hệ thống phải bảo đảm mỗi email/phone chỉ có tối đa một request `PENDING` bằng database constraint an toàn khi concurrent. |
| FR-F01-09 | Approve/reject phải clear password hash; approve phải tạo user, userCode, department, initial roles và link createdUserId trong một transaction. |

## F02 – Asset Management

| ID | Yêu cầu chức năng |
|---|---|
| FR-F02-01 | Hệ thống phải hiển thị danh sách asset cho user có quyền xem, gồm asset code bất biến và hỗ trợ tìm theo mã. |
| FR-F02-02 | Hệ thống phải hiển thị asset code, chi tiết, danh mục, department và trạng thái hiện tại của asset. |
| FR-F02-03 | Hệ thống phải cung cấp danh sách asset `AVAILABLE` đủ điều kiện tạo yêu cầu mượn. |
| FR-F02-04 | Hệ thống phải cho phép user có quyền tạo asset với model, dữ liệu nhận diện hợp lệ và image_url tùy chọn; server cấp asset code bất biến theo asset type. |
| FR-F02-05 | Hệ thống phải cho phép user có quyền cập nhật thông tin, image_url và department quản lý asset. |
| FR-F02-06 | Hệ thống phải hỗ trợ xem, tạo và cập nhật brand/type/model ở mức MVP; type có prefix asset-code nội bộ duy nhất do server sinh. |
| FR-F02-07 | Hệ thống phải cho phép lọc asset theo thông tin và trạng thái được hỗ trợ. |
| FR-F02-08 | Hệ thống phải hỗ trợ ngừng sử dụng asset khi user có permission phù hợp và asset không ở `RESERVED` hoặc `BORROWED`. |
| FR-F02-09 | Hệ thống phải cho phép quét QR URL bất biến của asset tại màn hình QR Scan và mở trang chi tiết khi QR hợp lệ; QR không tạo inventory session và không đổi trạng thái asset. |

## F03 – Borrow Request

| ID | Yêu cầu chức năng |
|---|---|
| FR-F03-01 | Hệ thống phải cho phép nhân viên tạo phiếu gồm một hoặc nhiều asset `AVAILABLE` và Borrowing Purpose hợp lệ. |
| FR-F03-02 | Hệ thống phải kiểm tra Borrowing Purpose không rỗng, asset tồn tại, không trùng trong phiếu và ngày trả dự kiến hợp lệ. |
| FR-F03-03 | Hệ thống phải cho phép nhân viên xem danh sách phiếu do mình tạo. |
| FR-F03-04 | Hệ thống phải cho phép nhân viên xem chi tiết và trạng thái từng asset trong phiếu của mình. |
| FR-F03-05 | Hệ thống phải cho phép nhân viên thu hồi toàn bộ phiếu khi chưa có asset nào được bàn giao. |

## F04 – Approval & Reservation

| ID | Yêu cầu chức năng |
|---|---|
| FR-F04-01 | Hệ thống phải cho phép user có quyền xem các phiếu và detail cần xử lý. |
| FR-F04-02 | Hệ thống phải cho phép duyệt một detail `PENDING` khi asset còn `AVAILABLE`. |
| FR-F04-03 | Hệ thống phải cho phép từ chối một detail `PENDING` và ghi lý do. |
| FR-F04-04 | Hệ thống phải hỗ trợ Approve All theo partial success trên các detail `PENDING`. |
| FR-F04-05 | Hệ thống phải suy ra trạng thái tổng của phiếu từ các detail và lịch sử hoàn trả theo BR. |
| FR-F04-06 | Hệ thống phải ngăn hai thao tác đồng thời cùng duyệt giữ một asset. |

## F05 – Handover & Return

| ID | Yêu cầu chức năng |
|---|---|
| FR-F05-01 | Hệ thống phải cho phép user có quyền xác nhận bàn giao một detail đã duyệt và được giữ chỗ. |
| FR-F05-02 | Hệ thống phải tạo lịch sử bàn giao duy nhất cho detail và ghi người/thời điểm bàn giao. |
| FR-F05-03 | Hệ thống phải cho phép nhân viên xem các asset mình đang mượn. |
| FR-F05-04 | Hệ thống phải cho phép user có quyền xác nhận hoàn trả bình thường và ghi tình trạng trả. |
| FR-F05-05 | Hệ thống phải cho phép xem lịch sử mượn của bản thân hoặc toàn bộ theo permission và mở chi tiết một history để xem request reason, approval, handover và return metadata đã được ghi nhận. |

## F06 – Asset Issues & Repair

| ID | Yêu cầu chức năng |
|---|---|
| FR-F06-01 | Hệ thống phải cho phép đối tượng được phép báo sự cố của một asset. |
| FR-F06-02 | Hệ thống phải cho phép user có quyền xem danh sách và chi tiết issue. |
| FR-F06-03 | Hệ thống phải cho phép xác nhận issue `REPORTED`. |
| FR-F06-04 | Hệ thống phải cho phép từ chối issue `REPORTED`. |
| FR-F06-05 | Hệ thống phải cho phép bắt đầu sửa issue đã xác nhận. |
| FR-F06-06 | Hệ thống phải cho phép cập nhật vendor sửa chữa, thời gian, chi phí, kết quả và ghi chú phù hợp giai đoạn xử lý; set/clear vendor cần cả repair permission và `vendor.view`. |
| FR-F06-07 | Hệ thống phải cho phép hoàn tất sửa thành công và đồng bộ asset về `AVAILABLE`. |
| FR-F06-08 | Hệ thống phải ghi nhận sửa thất bại ở issue `FAILED` và chuyển asset `IN_REPAIR → DAMAGED`. |

## Shared Vendor Master

| ID | Yêu cầu chức năng |
|---|---|
| FR-VEN-01 | Hệ thống phải cho phép user có `vendor.view` tìm kiếm, phân trang và lọc vendor theo active/inactive. |
| FR-VEN-02 | Hệ thống phải cho phép user có `vendor.create` tạo vendor active; contact field rỗng phải được lưu thành `null`. |
| FR-VEN-03 | Hệ thống phải cho phép user có `vendor.update` sửa thông tin vendor; endpoint update thông tin không được đổi `isActive`. |
| FR-VEN-03A | Hệ thống phải cho phép user có `vendor.manage_status` activate/deactivate vendor qua endpoint status riêng cho cả hai chiều. |
| FR-VEN-04 | Hệ thống không cung cấp thao tác xóa vendor trong MVP; vendor không còn sử dụng phải được deactivate để giữ lịch sử. |
| FR-VEN-05 | Hệ thống phải hiển thị tên vendor hiện tại trong issue history; vendor inactive không được assign cho repair mới. |

## F07 – Notifications

| ID | Yêu cầu chức năng |
|---|---|
| FR-F07-01 | Hệ thống phải cho phép user xem notification của chính mình theo thứ tự thời gian. |
| FR-F07-02 | Hệ thống phải hiển thị trạng thái và số lượng notification chưa đọc. |
| FR-F07-03 | Hệ thống phải cho phép user đánh dấu notification của mình đã đọc. |
| FR-F07-04 | Hệ thống phải điều hướng tới entity liên quan khi logical reference hợp lệ và user có quyền xem. |
| FR-F07-05 | Hệ thống phải tạo notification trong hệ thống cho request, approval, issue, handover và return event theo recipient user/permission liên quan. |

## F08 – Administration

| ID | Yêu cầu chức năng |
|---|---|
| FR-F08-01 | Hệ thống phải cho phép Admin có quyền xem và tìm danh sách user, bao gồm mã user. |
| FR-F08-02 | Hệ thống phải cho phép Admin có quyền tạo user với department hợp lệ và avatar_url tùy chọn; hệ thống tự cấp mã user duy nhất theo format `BI[YY][Sequence]`. |
| FR-F08-03 | Hệ thống phải cho phép Admin có quyền cập nhật thông tin và avatar_url của user, nhưng không được sửa mã user. |
| FR-F08-04 | Hệ thống phải cho phép Admin có quyền kích hoạt hoặc vô hiệu hóa user mà không thay đổi mã user. |
| FR-F08-05 | Hệ thống phải hiển thị các role có sẵn phục vụ việc phân vai trò. |
| FR-F08-06 | Hệ thống phải cho phép Admin có quyền gán hoặc gỡ role có sẵn của user. |
| FR-F08-07 | Hệ thống phải từ chối thao tác quản trị khi người thực hiện thiếu permission tương ứng. |
| FR-F08-08 | Hệ thống phải cho phép list/detail role và hiển thị type, permission count, user count cùng permission descriptions. |
| FR-F08-09 | Hệ thống phải cho phép tạo custom role với ít nhất một existing permission. |
| FR-F08-10 | Hệ thống phải cho phép rename custom role và replace-set permission; system role name không được đổi. |
| FR-F08-11 | Hệ thống chỉ cho đọc permission catalogue để cấu hình role, không cho permission CRUD. |
| FR-F08-12 | Hệ thống phải rollback mutation nếu không còn active user có đủ essential admin permissions. |
| FR-F08-13 | Hệ thống phải cho phép user có `department.view` xem danh sách department active/inactive và user có `department.create` tạo department active. |
| FR-F08-14 | Hệ thống phải cho phép user có `department.update` sửa tên department; không cho phép đổi status trong endpoint update thông tin. |
| FR-F08-15 | Hệ thống phải cho phép user có `department.manage_status` bật/tắt department; department inactive vẫn giữ lịch sử nhưng không dùng cho assignment mới. |
