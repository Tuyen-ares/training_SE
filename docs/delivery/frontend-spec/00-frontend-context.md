# Frontend Context

## Mục tiêu

Frontend MVP giúp user được cấp quyền quản lý asset, mượn–duyệt–bàn giao–trả, xử lý issue/sửa chữa, theo dõi notification và quản trị user. Tài liệu này chuyển requirement đã chốt thành cấu trúc giao diện có thể review trước khi viết screen spec, API contract hoặc code.

## Baseline và giới hạn

- Frontend dự kiến dùng Vue 3 và Ant Design.
- `DESIGN_SYSTEM.md` và `DESIGN.md` quyết định visual convention; Stitch chỉ là visual reference.
- Backend, API contract, database và migration chưa thuộc task này.
- Code/route hiện tại có registration và menu theo role cũ. Registration đã được chốt lại là yêu cầu chờ xét duyệt; menu theo role cũ vẫn chỉ là implementation/reference cũ, không phải nguồn nghiệp vụ.

## Quyết định frontend đã chốt

- Có **một Dashboard chung** sau đăng nhập, không có Employee/Manager/Admin dashboard riêng.
- Dashboard chỉ hiện widget hoặc shortcut đến nghiệp vụ mà user có permission. Nó không tạo KPI, analytics hoặc workflow mới.
- Permission thực tế là hợp của permission từ mọi role của user; không có hierarchy `Admin > Manager > Employee`.
- Sidebar và action hiển thị theo permission/capability, không theo tên role.
- Một screen có thể phục vụ nhiều User Story; một User Story có thể dùng nhiều screen.
- Trạng thái `PENDING`, `APPROVED`, `REJECTED`, `RESERVED`, `BORROWED`, `DAMAGED`, `IN_REPAIR`, `RETIRED` phải bám theo Business Rule, không suy diễn transition mới ở frontend.

## Discrepancy quan trọng với nguồn cũ

| ID | Nguồn cũ | Baseline frontend MVP |
| --- | --- | --- |
| FD-01 | Stitch có 3 dashboard theo role. | Một dashboard chung, widget theo permission. |
| FD-02 | `AUTH-02` hỗ trợ registration trực tiếp. | Registration tạo yêu cầu `PENDING`; reviewer có permission xét duyệt mới cấp account, role và department. |
| FD-03 | Một số screen duyệt ở header hoặc coi duyệt là bàn giao. | Duyệt theo detail; bàn giao/hoàn trả xác định qua borrow history. |
| FD-04 | Stitch có CRUD department, role và permission. | Không có CRUD role/permission; department CRUD không thuộc feature MVP. |
| FD-05 | Repair có nhiều page bước riêng. | Issue Detail giữ context; các bước repair là workflow state, không buộc thành page riêng. |

## Kết quả cần có trước implementation

1. Review và xác nhận Screen Inventory.
2. Chốt cách biểu diễn các điểm chưa quyết định trong Frontend Open Questions.
3. Cập nhật Stitch theo inventory đã được duyệt.
4. Chỉ sau đó mới lập API contract, screen spec chi tiết và implement.
