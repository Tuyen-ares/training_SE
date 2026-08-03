# Business Rules

## Authentication và RBAC

- **BR-AUTH-01:** Chỉ tài khoản đang hoạt động được đăng nhập hoặc refresh phiên.
- **BR-AUTH-02:** Đăng nhập sai không được tiết lộ email hay mật khẩu là phần không hợp lệ.
- **BR-AUTH-03:** Refresh token đã dùng, bị thu hồi hoặc hết hạn không được cấp phiên mới.
- **BR-AUTH-04:** Logout phải kết thúc khả năng tiếp tục refresh của phiên tương ứng.
- **BR-RBAC-01:** Quyền thực tế được suy ra từ permission gán cho các role của user.
- **BR-RBAC-02:** Không có role hierarchy hoặc role inheritance.
- **BR-RBAC-03:** Admin muốn làm nghiệp vụ Manager phải được gán permission tương ứng.
- **BR-RBAC-04:** MVP chỉ cho gán/gỡ role có sẵn; không CRUD role hoặc permission code.

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
