# Navigation

## AppShell

Authenticated app dùng AppShell theo `DESIGN_SYSTEM.md`: sidebar trắng, header trắng, breadcrumb/page context ở trái và identity/avatar/account action ở phải. Dashboard là điểm vào sau login; nếu user không có capability cho một khu vực thì menu và action khu vực đó không hiển thị.

Backend vẫn là nơi quyết định authorization. Việc ẩn menu/action chỉ hỗ trợ trải nghiệm; mọi truy cập bị từ chối phải dùng `SCR-SYS-02` mà không làm lộ dữ liệu.

## Dashboard chung theo permission

`SCR-APP-01` là dashboard vận hành chung, không phải dashboard theo role và không chỉ là shortcut launcher. Ngoài shortcut, Dashboard có thể gồm personal operational summary của user hiện tại, operational summary theo permission và work queue theo permission. Mọi nội dung đều dùng hợp permission của các role được gán trực tiếp; không hard-code Staff, Manager hoặc Admin.

| Loại nội dung | Phạm vi |
| --- | --- |
| Personal Summary | Dữ liệu của chính user, như tài sản đang mượn và request đang chờ/đang xử lý. |
| Operational Summary | Direct count từ domain data đã có, như trạng thái asset; không phải chart/trend/KPI. |
| Work Queue | Summary/count và link đến queue logical hiện hữu. |
| Quick Access | Shortcut theo capability; không là nội dung chính duy nhất. |

Section không đủ permission không render; layout tự reflow tự nhiên, không để blank placeholder hoặc block chồng nhau. Ví dụ capability có thể làm hiện widget/queue:

| Capability nghiệp vụ | Widget/shortcut |
| --- | --- |
| Xem phiếu của mình | My Borrow Requests |
| Duyệt request | Pending Approvals |
| Xác nhận bàn giao | Handover Queue |
| Xác nhận hoàn trả | Return Queue |
| Quản lý issue | Issue Queue |
| Quản lý user | User Management |

Tên permission code cuối cùng thuộc API/permission registry, chưa được chốt trong frontend spec. Không suy ra quyền bằng tên role.

## Navigation theo capability

| Khu vực | Screen chính | Điều kiện xuất hiện |
| --- | --- | --- |
| Tổng quan | `SCR-APP-01` | User đã đăng nhập. |
| Thiết bị | `SCR-F02-01` | Permission xem asset. |
| Phiếu của tôi | `SCR-F03-02` | Khả năng tạo/xem phiếu của mình. |
| Chờ phê duyệt | `SCR-F04-01` | Permission xem request cần xử lý. |
| Bàn giao & hoàn trả | `SCR-F05-01` | Có ít nhất một permission bàn giao hoặc nhận trả. |
| Hoạt động mượn | `SCR-F05-02` | Xem tài sản đang mượn hoặc lịch sử theo phạm vi. |
| Sự cố & sửa chữa | `SCR-F06-01` | Permission xem/quản lý issue. |
| Thông báo | `SCR-F07-01` | User đã đăng nhập; entry có thể từ header. |
| Người dùng | `SCR-F08-01` | Permission quản lý user. |
| Danh mục asset | `SCR-F02-04` | Permission quản lý danh mục asset. |

## Quan hệ screen và workflow state

- `SCR-F03-03` phục vụ cả người tạo phiếu và người có quyền xử lý; data/action thay đổi theo ownership và permission.
- `SCR-F05-01` có hai queue/tab logic: bàn giao và nhận trả. Form xác nhận là state có context, không phải route mới.
- `SCR-F05-02` tái sử dụng list/history cho “đang mượn”, lịch sử của tôi và lịch sử toàn bộ theo permission.
- `SCR-F06-02` chứa workflow xác minh, bắt đầu sửa, cập nhật và kết thúc sửa trong cùng context issue.
- `SCR-F08-02` dùng cùng form surface cho tạo/cập nhật user và vùng gán/gỡ role có sẵn.

## Entry và lỗi điều hướng

- Login thành công mở Dashboard chung.
- Notification mở entity liên quan chỉ khi logical reference hợp lệ và user có permission xem entity.
- QR hợp lệ mở Asset Detail; QR không tồn tại dùng state not-found, không tạo inventory workflow.
- Resource không tồn tại hoặc access bị từ chối dùng `SCR-SYS-02`, có action quay về vị trí an toàn.
