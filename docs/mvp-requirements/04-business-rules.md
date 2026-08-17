# Business Rules

## Authentication và RBAC

- **BR-AUTH-01:** Chỉ tài khoản đang hoạt động được đăng nhập hoặc refresh phiên.
- **BR-AUTH-02:** Đăng nhập sai không được tiết lộ email hay mật khẩu là phần không hợp lệ.
- **BR-AUTH-03:** Refresh token đã dùng, bị thu hồi hoặc hết hạn không được cấp phiên mới.
- **BR-AUTH-04:** Logout phải kết thúc khả năng tiếp tục refresh của phiên tương ứng.
- **BR-AUTH-05:** Đăng ký công khai chỉ tạo yêu cầu `PENDING`; yêu cầu này không tạo phiên và không được đăng nhập trước khi được duyệt.
- **BR-AUTH-06:** Người có permission `user_registration.review` có thể duyệt hoặc từ chối yêu cầu; mapping khởi tạo cấp permission này cho `admin` và `asset_manager`, nhưng runtime chỉ kiểm tra permission code. Khi duyệt bắt buộc chọn department và có thể gán nhiều role có sẵn; nếu bỏ qua `roleIds`, hệ thống gán `employee`.
- **BR-AUTH-07:** Mỗi email hoặc số điện thoại chỉ có tối đa một registration request `PENDING`; invariant phải được bảo đảm bằng unique key ở database để an toàn khi concurrent. Request terminal phải clear pending key để có thể đăng ký lại.
- **BR-AUTH-08:** Approve phải tạo user active, cấp userCode, gán department/initial roles, link `createdUserId`, cập nhật audit và clear password hash trong cùng transaction. Reject cũng phải clear password hash; rejection reason là optional.
- **BR-RBAC-01:** Quyền thực tế được suy ra từ permission gán cho các role của user.
- **BR-RBAC-02:** Không có role hierarchy hoặc role inheritance.
- **BR-RBAC-03:** Admin muốn làm nghiệp vụ Manager phải được gán permission tương ứng.
- **BR-RBAC-04:** Phiên bản này cho list/detail/create role, rename custom role, replace-set permission của role và replace-set role của user; không delete role và không CRUD permission code.
- **BR-RBAC-05:** System role không được đổi tên nhưng được thay permission. Mỗi role phải giữ ít nhất một permission và mỗi user phải giữ ít nhất một role.
- **BR-RBAC-06:** Thao tác nhạy cảm phải giữ ít nhất một active user có đủ tập essential admin permissions: `user.view/create/update/manage_status`, `role.view/create/update/assign`, `permission.view`, `user_registration.review`. Invariant dựa trên effective permission, không dựa vào tên role.
- **BR-RBAC-07:** Permission thay đổi theo quan hệ role-permission hiện tại và có hiệu lực cho user ở lần login hoặc refresh tiếp theo.

## Asset

- **BR-AST-01:** `assets.status` chỉ gồm `AVAILABLE`, `RESERVED`, `BORROWED`, `DAMAGED`, `IN_REPAIR`, `RETIRED`.
- **BR-AST-02:** Chỉ asset `AVAILABLE` mới đủ điều kiện được chọn vào yêu cầu mượn mới.
- **BR-AST-03:** `RESERVED` nghĩa là đã được duyệt nhưng chưa bàn giao.
- **BR-AST-04:** `DAMAGED` chỉ dùng sau khi sự cố đã được xác nhận.
- **BR-AST-05:** `qr_code` phải duy nhất; QR không tạo thành module kiểm kê.
- **BR-AST-06:** `serial_number`, khi có giá trị, phải duy nhất.
- **BR-AST-07:** Asset `RETIRED` không được tham gia nghiệp vụ mượn, bàn giao hoặc sửa chữa mới.
- **BR-AST-08:** Nhân viên được xem asset đủ điều kiện mượn trên toàn công ty; `department_id` không giới hạn visibility trong MVP.
- **BR-AST-09:** Quét QR thuộc F02 ở mức tra cứu và có thể mở chi tiết asset; không tạo workflow kiểm kê.
- **BR-AST-10:** MVP không hỗ trợ xóa brand, asset type hoặc asset model..
- **BR-AST-11:** Mỗi asset có `asset_code` bất biến, duy nhất, gồm prefix chuẩn hóa từ asset type và sequence tăng theo prefix (`PREFIX0001`). QR vẫn là định danh tra cứu độc lập.
- **BR-AST-12:** Prefix asset type được server chuẩn hóa Unicode NFD, bỏ dấu, đổi `Đ/đ` thành `D/d`, viết hoa và chỉ giữ `A-Z0-9`; rỗng hoặc trùng bị từ chối. Đổi tên type chỉ ảnh hưởng mã asset tạo sau đó.

## Borrow Request và Approval

- **BR-BOR-01:** Một borrow request có một hoặc nhiều tài sản.
- **BR-BOR-02:** Mỗi tài sản trong phiếu được biểu diễn bằng một request detail.
- **BR-BOR-03:** Việc duyệt được thực hiện theo từng request detail.
- **BR-BOR-04:** `approval_status` chỉ gồm `PENDING`, `APPROVED`, `REJECTED`.
- **BR-BOR-05:** Nhiều detail `PENDING` có thể cùng chọn một asset khi asset còn `AVAILABLE`.
- **BR-BOR-06:** Tại một thời điểm chỉ một detail `APPROVED` được giữ một asset.
- **BR-BOR-07:** Duyệt detail hợp lệ chuyển asset `AVAILABLE → RESERVED`.
- **BR-BOR-08:** `RESERVED` không đồng nghĩa đã bàn giao.
- **BR-BOR-09:** Thu hồi phiếu đã có detail duyệt nhưng chưa bàn giao chuyển các asset được giữ `RESERVED → AVAILABLE`.
- **BR-BOR-10:** Duyệt detail và giữ asset phải là một thao tác nguyên tử; lỗi ở bất kỳ bước nào không được để lại trạng thái một nửa.
- **BR-BOR-11:** Approve All là bulk action trên từng detail và sử dụng partial success.
- **BR-BOR-12:** Detail không đủ điều kiện trong Approve All giữ `PENDING`, không tự chuyển `REJECTED`.
- **BR-BOR-13:** Không có detail `APPROVED` và còn `PENDING` thì header là `PENDING`, kể cả có detail `REJECTED`.
- **BR-BOR-14:** Tất cả detail `APPROVED` thì header là `APPROVED`; tất cả `REJECTED` thì header là `REJECTED`.
- **BR-BOR-15:** Có ít nhất một detail `APPROVED` và còn detail trạng thái khác thì header là `PARTIALLY_APPROVED`.
- **BR-BOR-16:** Nhân viên chỉ được thu hồi toàn bộ phiếu của mình khi chưa có asset nào của phiếu ở `BORROWED`.
- **BR-BOR-17:** Thu hồi hợp lệ đặt header `CANCELLED`, giữ nguyên trạng thái detail để bảo toàn lịch sử và giải phóng mọi asset `RESERVED` bởi phiếu.
- **BR-BOR-18:** borrow_request chỉ chuyển `COMPLETED` khi tất cả detail `APPROVED`đã được bàn giao đều đã hoàn trả, và không còn detail `PENDING` cần xử lý.đã được bàn giao đều đã hoàn trả, và không còn detail PENDING cần xử lý. Detail REJECTED không ảnh hưởng việc hoàn tất phiếu.

## Bàn giao và hoàn trả

- **BR-HAN-01:** Chỉ asset `RESERVED` cho đúng detail mới được bàn giao.
- **BR-HAN-02:** Bàn giao chuyển asset `RESERVED → BORROWED`.
- **BR-HAN-03:** `borrow_histories` là nguồn xác định bàn giao và hoàn trả thực tế.
- **BR-HAN-04:** Một request detail có tối đa một borrow history.
- **BR-HAN-05:** `handed_over_by` là người có quyền xác nhận bàn giao.
- **BR-HAN-06:** Người mượn được truy qua detail → request → `user_id`, không lưu lặp trong history.
- **BR-RET-01:** `received_by` là người có quyền tiếp nhận asset khi trả, không phải người mượn.
- **BR-RET-02:** Hoàn trả bình thường chuyển asset `BORROWED → AVAILABLE`.
- **BR-RET-03:** `return_condition` ghi nhận tình trạng asset khi hoàn trả.
- **BR-RET-04:** Khi đã có asset `BORROWED`, không được thu hồi phiếu; phải dùng quy trình hoàn trả.

## Asset Issue và Repair

- **BR-ISS-01:** Báo mới tạo issue `REPORTED` và chưa tự đổi asset sang `DAMAGED`.
- **BR-ISS-02:** Xác nhận sự cố mới chuyển asset sang `DAMAGED`.
- **BR-ISS-03:** Issue chỉ gồm `REPORTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `IN_REPAIR`, `COMPLETED`, `FAILED`.
- **BR-ISS-04:** Bắt đầu sửa chuyển issue sang `IN_REPAIR` và asset `DAMAGED → IN_REPAIR`.
- **BR-ISS-05:** Sửa thành công chuyển issue `COMPLETED` và asset `IN_REPAIR → AVAILABLE`.
- **BR-ISS-06:** Chuyển asset sang `RETIRED` phải là quyết định nghiệp vụ có thẩm quyền.
- **BR-ISS-07:** Khi sửa thất bại, issue thành `FAILED` và asset chuyển `IN_REPAIR → DAMAGED`; không tự chuyển `RETIRED`.
- **BR-ISS-08:** Khi người có quyền xác nhận asset hỏng lúc trả, history ghi trả và `return_condition = DAMAGED`, issue được tạo `CONFIRMED`, asset chuyển `BORROWED → DAMAGED`.

## Shared Vendor Master

- **BR-VEN-01:** `vendors.name` là duy nhất theo database collation; các contact field tùy chọn được trim và chuỗi rỗng được lưu thành `NULL`.
- **BR-VEN-02:** Vendor mới active; vendor inactive không xuất hiện trong selector repair mặc định và không được assign cho repair mới.
- **BR-VEN-03:** Vendor inactive vẫn được xem/sửa trong Vendor Management theo permission và vẫn hiển thị trong issue history.
- **BR-VEN-04:** `asset_issues.vendor_id` nullable tham chiếu `vendors.id` bằng FK `ON DELETE RESTRICT`; MVP không cung cấp nghiệp vụ xóa vendor, deactivate giữ record và lịch sử.
- **BR-VEN-05:** Đổi tên vendor làm thay đổi tên hiển thị của issue lịch sử; phase này không lưu name snapshot.
- **BR-VEN-06:** `vendorId` omitted giữ nguyên vendor và chỉ cần repair permission; `vendorId` number hoặc `null` là thay đổi field và cần đồng thời repair permission phù hợp và `vendor.view`.
- **BR-VEN-07:** Assign/clear và activate/deactivate khóa cùng vendor row bằng transaction; assignment thấy vendor inactive sau khi deactivation commit thì bị từ chối.

## Department

- **BR-DEP-01:** Department mới active; `department.update` chỉ sửa thông tin department, còn bật/tắt `is_active` cần `department.manage_status`.
- **BR-DEP-02:** Department inactive giữ các quan hệ user/asset và lịch sử hiện có, nhưng không được chọn cho assignment user mới, registration approval hoặc asset mới/cập nhật.
- **BR-DEP-03:** MVP không cung cấp xóa department; `department.delete` không thuộc permission catalogue.

## Notification và User

- **BR-NOT-01:** `related_entity_type` và `related_entity_id` là tham chiếu logic, không phải quan hệ khóa ngoại.
- **BR-NOT-02:** User chỉ được xem và cập nhật trạng thái đọc notification của chính mình.
- **BR-NOT-03:** Khi notification được đánh dấu đã đọc, hệ thống phải ghi nhận trạng thái và thời điểm đọc.
- **BR-NOT-04:** Notification MVP chỉ nằm trong hệ thống; recipient xác định theo user/permission và entity, không hard-code theo tên role.
- **BR-NOT-05:** MVP phải tạo notification cho các sự kiện nghiệp vụ quan trọng gồm:
- có borrow request mới cần xử lý;
- kết quả duyệt/từ chối yêu cầu mượn;
- xác nhận bàn giao;
- xác nhận hoàn trả;
- có asset issue mới cần xử lý;
- các thay đổi quan trọng trong vòng đời asset issue.
- **BR-USR-01:** Email và số điện thoại user phải duy nhất.
- **BR-USR-02:** Mật khẩu không được hiển thị trong dữ liệu trả cho người dùng.
- **BR-USR-03:** Vô hiệu hóa user không được xóa các quan hệ và lịch sử nghiệp vụ đã có.
- **BR-USR-04:** `user.update` chỉ sửa thông tin; bật/tắt `is_active` cho cả hai chiều cần `user.manage_status`.
- **BR-USR-05:** Self-service profile chỉ được sửa `name`, `phone` và `avatar_url`; email, department, user code, roles và `is_active` là read-only với user hiện tại.
- **BR-USR-06:** Đổi mật khẩu self-service phải xác minh mật khẩu hiện tại, lưu hash mới và thu hồi toàn bộ refresh-token session; không trả credential hoặc token trong response.
