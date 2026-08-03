# Stitch Canonical Screen Map

Tài liệu này là danh sách chuẩn duy nhất cho canvas Stitch của BigIn Asset
Management. Một screen xuất hiện đúng một lần; các node không nhãn, ảnh upload,
`DESIGN.md` upload cũ và screen legacy không thuộc map này.

```text
AUTH-01 Đăng nhập ──┬── AUTH-02 Đăng ký
                    ├── DASH-01 Nhân viên
                    │   ├── AST-01 Danh sách thiết bị
                    │   └── BOR-01 Tạo yêu cầu → BOR-02 Yêu cầu của tôi
                    │       → BOR-03 Chi tiết yêu cầu → BOR-04 Lịch sử mượn
                    │       → BOR-05 Chi tiết lịch sử
                    ├── DASH-02 Quản lý tài sản
                    │   ├── BOR-06 Chờ phê duyệt → BOR-07 Chi tiết phê duyệt
                    │   │   → BOR-08 Xác nhận từ chối | BOR-09 Trả thiết bị
                    │   ├── AST-02 Quản lý thiết bị → AST-03 Chi tiết thiết bị
                    │   │   → AST-04 Thêm thiết bị | AST-05 Danh mục
                    │   └── REP-01 Danh sách sửa chữa → REP-02 Bắt đầu
                    │       → REP-03 Chi tiết → REP-04 Hoàn tất | REP-05 Không thể bắt đầu
                    └── DASH-03 Quản trị
                        ├── USR-01 Danh sách → USR-02 Thêm → USR-03 Chi tiết → USR-04 Chỉnh sửa
                        ├── DEP-01 Phòng ban
                        ├── RBAC-01 Vai trò → RBAC-02 Danh mục quyền → RBAC-03 Chi tiết vai trò
                        ├── BOR-10 Lịch sử mượn toàn hệ thống
                        ├── SYS-403 Truy cập bị từ chối
                        └── DOC-01 Tài liệu dự án
```

| Nhóm | Screen cần có | Nội dung tối thiểu | Liên quan trực tiếp |
|---|---|---|---|
| Auth | `AUTH-01 — Đăng nhập` | Email, mật khẩu, đăng nhập, link đăng ký | Điểm vào ba dashboard |
| Auth | `AUTH-02 — Đăng ký` | Họ tên, email, mật khẩu, xác nhận mật khẩu, vai trò mặc định Nhân viên | Quay lại `AUTH-01` |
| Nhân viên | `DASH-01 — Tổng quan nhân viên` | Tóm tắt tài sản/yêu cầu cá nhân, CTA mượn thiết bị | `AST-01`, `BOR-01`, `BOR-02` |
| Nhân viên | `AST-01 — Danh sách thiết bị` | Tìm kiếm, lọc, bảng thiết bị có thể mượn | `BOR-01` |
| Nhân viên | `BOR-01 — Tạo yêu cầu mượn` | Chọn thiết bị, thời gian, mục đích, validation, gửi yêu cầu | `BOR-02` |
| Nhân viên | `BOR-02 — Yêu cầu của tôi` | Bảng yêu cầu, trạng thái, bộ lọc | `BOR-03`, `BOR-04` |
| Nhân viên | `BOR-03 — Chi tiết yêu cầu chờ duyệt` | Thiết bị, thời gian, trạng thái, lịch sử xử lý | `BOR-02`, `BOR-04` |
| Nhân viên | `BOR-04 — Lịch sử mượn của tôi` | Danh sách lượt mượn đã hoàn tất/trả | `BOR-05` |
| Nhân viên | `BOR-05 — Chi tiết lịch sử mượn` | Thông tin lượt mượn/trả và timeline | `BOR-04` |
| Quản lý tài sản | `DASH-02 — Tổng quan quản lý tài sản` | KPI tài sản, yêu cầu chờ duyệt, sửa chữa, cảnh báo | `BOR-06`, `AST-02`, `REP-01` |
| Quản lý tài sản | `BOR-06 — Chờ phê duyệt` | Hàng đợi yêu cầu, lọc/trạng thái, thao tác nhanh | `BOR-07` |
| Quản lý tài sản | `BOR-07 — Chi tiết phê duyệt` | Yêu cầu, kiểm tra tồn kho, duyệt/từ chối | `BOR-08`, `BOR-09` |
| Quản lý tài sản | `BOR-08 — Xác nhận từ chối` | Dialog lý do từ chối và xác nhận | `BOR-07` |
| Quản lý tài sản | `BOR-09 — Trả thiết bị` | Kiểm tra tình trạng, xác nhận check-in, ghi chú | `BOR-07`, `AST-03` |
| Quản lý tài sản | `AST-02 — Quản lý thiết bị` | Bảng tài sản toàn hệ thống, lọc, thao tác quản lý | `AST-03`, `AST-04`, `AST-05` |
| Quản lý tài sản | `AST-03 — Chi tiết thiết bị` | Thông tin, trạng thái, lịch sử, tình trạng hỏng | `AST-02`, `REP-02` |
| Quản lý tài sản | `AST-04 — Thêm thiết bị mới` | Form mã, tên, danh mục, phòng ban, trạng thái | `AST-02` |
| Quản lý tài sản | `AST-05 — Quản lý danh mục` | Bảng danh mục tài sản và CRUD | `AST-02`, `AST-04` |
| Sửa chữa | `REP-01 — Danh sách sửa chữa` | Danh sách ticket, trạng thái, ưu tiên | `REP-02`, `REP-03` |
| Sửa chữa | `REP-02 — Bắt đầu sửa chữa` | Xác nhận kỹ thuật viên, mô tả ban đầu, ETA | `REP-01`, `REP-03` |
| Sửa chữa | `REP-03 — Chi tiết sửa chữa` | Timeline, chẩn đoán, chi phí, cập nhật trạng thái | `REP-04`, `REP-05` |
| Sửa chữa | `REP-04 — Hoàn tất sửa chữa` | Kết quả, chi phí, tình trạng sau sửa, xác nhận | `REP-03`, `AST-03` |
| Sửa chữa | `REP-05 — Không thể bắt đầu sửa chữa` | Lý do chặn/không thể xử lý và hành động kế tiếp | `REP-03` |
| Quản trị | `DASH-03 — Tổng quan Admin` | KPI người dùng, phòng ban, quyền và cảnh báo | `USR-01`, `DEP-01`, `RBAC-01` |
| Quản trị | `USR-01 — Danh sách người dùng` | Bảng người dùng, tìm kiếm, lọc vai trò/trạng thái | `USR-02`, `USR-03` |
| Quản trị | `USR-02 — Thêm người dùng mới` | Form tạo tài khoản, phòng ban, vai trò, trạng thái | `USR-01`, `USR-03` |
| Quản trị | `USR-03 — Chi tiết người dùng` | Hồ sơ, vai trò, phòng ban, lịch sử/quyền liên quan | `USR-01`, `USR-04` |
| Quản trị | `USR-04 — Chỉnh sửa người dùng` | Chỉnh hồ sơ, phòng ban, vai trò, trạng thái | `USR-03` |
| Quản trị | `DEP-01 — Quản lý phòng ban` | Bảng phòng ban, trưởng phòng, CRUD | `USR-01`, `USR-02` |
| Quản trị | `RBAC-01 — Danh sách vai trò` | Bảng vai trò, số quyền, hành động | `RBAC-02`, `RBAC-03` |
| Quản trị | `RBAC-02 — Danh mục quyền hạn` | Danh sách quyền theo module/hành động | `RBAC-01`, `RBAC-03` |
| Quản trị | `RBAC-03 — Chi tiết vai trò và phân quyền` | Permission matrix, kế thừa/quyền hiệu lực | `RBAC-01`, `RBAC-02` |
| Quản trị | `BOR-10 — Lịch sử mượn toàn hệ thống` | Bảng audit mượn/trả toàn công ty, lọc/xuất | `DASH-03`, `BOR-09` |
| Hệ thống | `SYS-403 — Truy cập bị từ chối` | Thông báo không có quyền, quay lại an toàn | Mọi route có RBAC |
| Hệ thống | `DOC-01 — Tài liệu dự án` | Liên kết/tóm tắt tài liệu nghiệp vụ và thiết kế | Không phải flow nghiệp vụ |

## Quy ước canvas

- Hàng 1: Auth và tài liệu; hàng 2: toàn bộ flow Nhân viên; hàng 3: toàn bộ
  flow Quản lý tài sản **bao gồm Sửa chữa**; hàng 4: toàn bộ flow Quản trị.
- Các screen trong cùng role nằm liên tiếp theo chiều ngang, theo thứ tự flow
  ở trên; không tách Repair thành một hàng riêng.
- Mỗi screen desktop là `1280 × 1024`, cách nhau `160px`; không đặt screen
  chồng lấn hoặc thêm bản không nhãn.
- `Operational Excellence System` là design system đang dùng. Các asset/screen
  legacy chỉ được ẩn hoặc bỏ khỏi canvas, không thuộc canonical map trên.
