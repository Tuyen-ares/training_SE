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
5. Từ User List/Form, user thực hiện activate/deactivate khi có permission; UI yêu cầu xác nhận trạng thái có tác động truy cập và giữ nguyên user code.

## Alternative Flows

- User inactive có thể được activate lại, sau đó đăng nhập nếu thông tin hợp lệ.

## Error / Invalid States

- Email/phone trùng hoặc department không tồn tại: validation, không lưu.
- Thiếu permission: action không hiển thị hoặc backend từ chối.
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
