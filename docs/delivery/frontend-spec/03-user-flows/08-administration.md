# FLOW-20 – Quản lý vòng đời user

## Goal

Tìm, tạo, cập nhật, kích hoạt hoặc vô hiệu hóa user nội bộ.

## Actor

Admin có permission quản lý user tương ứng.

## Related User Stories

`US-F08-01..04`.

## Preconditions

User đang đăng nhập và có từng capability cần thiết.

## Main Flow

1. User mở User List từ navigation/Dashboard.
2. User search/filter user theo user code và các thông tin được hỗ trợ; danh sách luôn hiển thị user code.
3. User mở User Form ở create hoặc edit mode.
4. User nhập thông tin/department/avatar URL hợp lệ và lưu; user code do hệ thống cấp và chỉ hiển thị, không có ô chỉnh sửa.
5. Từ User List/Form, user thực hiện activate/deactivate khi có `user.manage_status`; UI yêu cầu xác nhận trạng thái có tác động truy cập và giữ nguyên user code.

## Alternative Flows

- User inactive có thể được activate lại, sau đó đăng nhập nếu thông tin hợp lệ.

## Error / Invalid States

- Email/phone trùng hoặc department không tồn tại: validation, không lưu.
- Thiếu permission: action không hiển thị hoặc backend từ chối. `user.update` chỉ mở phần thông tin; status action cần `user.manage_status`.
- Password/hash không xuất hiện trong list/form result.

## Result

Tài khoản thay đổi trạng thái/metadata đúng rule mà lịch sử nghiệp vụ được giữ.

## Related Screens

`SCR-F08-01`, `SCR-F08-02`, `SCR-SYS-02`.

# FLOW-21 – Gán và gỡ role có sẵn

## Goal

Cập nhật tập role của một user để permission phản ánh trách nhiệm.

## Actor

Admin có permission gán role.

## Related User Stories

`US-F08-05`, `US-F01-04`.

## Preconditions

User quản trị có permission phân vai trò; target user và role đã tồn tại.

## Main Flow

1. User mở User Form & Roles của target user.
2. Hệ thống hiển thị các role có sẵn và tập role hiện tại.
3. User chọn/gỡ role rồi lưu.
4. Hệ thống cập nhật tập role, không tạo role/permission code mới.
5. Permission hiện hành của target user được áp dụng khi phiên của họ được cấp/làm mới theo F01.

## Alternative Flows

- Gán lại role đang có không tạo quan hệ trùng.

## Error / Invalid States

- Role không tồn tại hoặc user thiếu permission: không lưu tập role dở dang.
- Admin không tự nhận thêm capability chỉ vì có tên role Admin.

## Result

Tập role của target user nhất quán với flat RBAC.

## Related Screens

`SCR-F08-02`, `SCR-F08-01`.

# FLOW-22 – Xét duyệt registration request

Reviewer mở Administration > Registration Requests, lọc/search queue và mở detail. Approval bắt buộc department, hỗ trợ nhiều role và dùng employee khi không chọn; reject có reason optional. UI hiển thị outcome audit. Request đã terminal không còn action. Approve/reject lỗi không hiển thị success state và backend rollback toàn bộ.

Related screens: `SCR-F08-03`, `SCR-F08-04`.

# FLOW-23 – Quản lý role và permission set

Admin mở Administration > Roles để xem system/custom type, permission/user count và detail. Create yêu cầu name + ít nhất một permission. Detail nhóm permission theo domain, luôn hiển thị code và English description. System name disabled; custom name editable. Save permission là replace-set và báo conflict nếu vi phạm essential-admin invariant. Không có delete action hoặc Permission Catalog route.

Related screens: `SCR-F08-05`, `SCR-F08-06`.

# FLOW-24 – Quản lý department

## Goal

Xem và duy trì department dùng cho tổ chức, user và asset mà không làm mất
liên kết/history.

## Actor

User có `department.view` cho read, hoặc capability mutation tương ứng.

## Main Flow

1. User mở Administration > Departments và xem cả department active/inactive.
2. User có `department.create` tạo department active hoặc `department.update`
   sửa tên department.
3. User có `department.manage_status` bật/tắt status trong edit modal; UI
   không hiển thị delete action.
4. Các selector user/registration/asset chỉ cho chọn department active, ngoại
   lệ bản ghi đang sửa có thể giữ department hiện tại để không làm mất liên kết.

## Error / Invalid States

- Department inactive vẫn hiển thị trong danh sách quản trị nhưng bị từ chối
  khi dùng cho assignment mới.
- Gửi status trong endpoint update thông tin hoặc thiếu permission bị từ chối.

## Related Screens

`SCR-F08-07`, `SCR-F08-03`, `SCR-F08-04`, `SCR-F02-03`, `SCR-F08-02`.

# FLOW-25 – Self-service profile

## Goal

Cho phép user cập nhật thông tin cá nhân và mật khẩu của chính mình.

## Main Flow

1. User click avatar ở header và chọn `Profile`; không có Profile item trong sidebar.
2. Hệ thống hiển thị user code, email, department, roles và status ở chế độ chỉ đọc.
3. User cập nhật name, phone hoặc avatar URL rồi lưu qua self-service API.
4. User nhập mật khẩu hiện tại và mật khẩu mới để đổi mật khẩu.
5. Sau khi đổi mật khẩu thành công, refresh sessions bị thu hồi và user đăng nhập lại.

## Error / Invalid States

- Phone trùng hoặc profile field sai: không lưu thay đổi.
- Mật khẩu hiện tại sai: không đổi mật khẩu.
- Self-service request không thể thay đổi role, department, status hoặc user code.

## Related Screens

`SCR-F08-09`, `SCR-SYS-01`.
