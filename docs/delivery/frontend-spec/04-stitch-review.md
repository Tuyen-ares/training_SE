# Stitch Review

## Nguyên tắc review

Stitch là visual reference. Screen chỉ được tái sử dụng khi sau khi cập nhật vẫn phục vụ requirement MVP; không đổi requirement để bảo vệ Stitch cũ. Màu sắc, shell và Ant Design convention tiếp tục lấy từ `DESIGN_SYSTEM.md`/`DESIGN.md`.

## Mapping screen spec ↔ Stitch

| Screen Spec | Stitch hiện có | Status | Giữ được | Cần sửa/thêm |
| --- | --- | --- | --- | --- |
| SCR-SYS-01 Login | AUTH-01 | NEEDS_UPDATE | Auth layout và visual language. | Giữ entry sang Registration Request, account nội bộ và lỗi chung. |
| SCR-SYS-03 Registration Request | AUTH-02 | NEEDS_UPDATE | Auth layout, field hierarchy và responsive form. | English content; chỉ form thông tin cơ bản, không role/department; success state nói rõ request chờ review. |
| SCR-APP-01 Dashboard | Workspace Dashboard; DASH-01/02/03 | NEEDS_UPDATE | Layout queue/shortcut phù hợp từ từng dashboard. | Hợp nhất thành một logical Workspace Dashboard theo permission, gồm personal/operational summary, work queue và quick access; không KPI/role dashboard cố định. Stitch có thể có tối đa hai visual variant theo permission combination, không đại diện role. |
| SCR-SYS-02 Result | SYS-403 | NEEDS_UPDATE | Result/return-safe pattern. | Thêm not-found state và không lộ resource. |
| SCR-F02-01 Asset List | AST-01, AST-02 | NEEDS_UPDATE | Table, search/filter, asset context. | Một list theo permission với selection mode; QR entry; không tách theo role. |
| SCR-F02-02 Asset Detail | AST-03 | NEEDS_UPDATE | Detail layout, identity/status. | Action theo permission/state; asset image; QR lookup; không suy ra workflow cũ. |
| SCR-F02-03 Asset Form | AST-04 | NEEDS_UPDATE | Form surface. | image_url, department/reference validation; status không chỉnh như field thường. |
| SCR-F02-04 Asset Catalog | AST-05 | NEEDS_UPDATE | Catalog table/tabs. | Chỉ create/update; không xóa mục đang được tham chiếu. |
| SCR-F03-01 Create Request | BOR-01 | NEEDS_UPDATE | Form/asset selection composition. | Nhiều asset AVAILABLE, expected return date, duplicate/availability validation. |
| SCR-F03-02 My Requests | BOR-02 | NEEDS_UPDATE | Request list. | Header status mới nhất và link detail; withdrawal không là action row vô điều kiện. |
| SCR-F03-03 Request Detail | BOR-03, BOR-07 | NEEDS_UPDATE | Detail/table context. | Hợp nhất owner + approver view; detail approval, rejection reason, state-specific actions. |
| SCR-F04-01 Review Queue | BOR-06 | NEEDS_UPDATE | Queue table/filter. | Pending detail awareness, scope theo permission, open shared Request Detail. |
| SCR-F05-01 Fulfillment Queue | BOR-07, BOR-09 | NEEDS_UPDATE | Operational queue/return visual references. | Tách logic handover vs return trong context; damaged return phải tạo confirmed issue. |
| SCR-F05-02 Borrowing Activity | BOR-04, BOR-05, BOR-10 | NEEDS_UPDATE | History table/detail pattern. | Gộp current/own/all scope theo permission; không suy ra history chỉ từ approval. |
| SCR-F06-01 Issue List | REP-01 | NEEDS_UPDATE | Issue list/filter. | Status baseline và navigation vào shared Issue Detail. |
| SCR-F06-02 Issue Detail | REP-02..05 | NEEDS_UPDATE | Repair content/workflow visual states. | Hợp nhất bước repair; support REPORTED→CONFIRMED/REJECTED→IN_REPAIR→COMPLETED/FAILED. |
| SCR-F07-01 Notification Center | — | MISSING | Header styling có thể tái dùng. | Danh sách, unread/read và logical navigation. |
| SCR-F08-01 User List | USR-01 | NEEDS_UPDATE | User table/search. | Avatar URL/state and permission-only actions. |
| SCR-F08-02 User Form & Roles | USR-02..04 | NEEDS_UPDATE | Form/profile/role selection patterns. | Hợp nhất create/edit/role assignment; không CRUD role/permission. |

## Stitch screen không thuộc MVP mới

| Stitch Screen | Xử lý | Lý do |
| --- | --- | --- |
| Dashboard Nhân viên, Dashboard Quản lý, Dashboard Admin (DASH-01, DASH-02, DASH-03) | OUTDATED | Superseded bởi một logical `SCR-APP-01 Workspace Dashboard`. Các visual variant, nếu có, chỉ minh họa effective-permission combinations; không đại diện role. |
| DEP-01 | OUTDATED | Department CRUD không có feature/US MVP. |
| RBAC-01, RBAC-02, RBAC-03 | OUTDATED | MVP chỉ gán/gỡ role có sẵn, không CRUD role/permission. |
| DOC-01 | OUTDATED | Không phải workflow nghiệp vụ MVP. |
| BOR-08, BOR-09, REP-02, REP-04, REP-05 | OUTDATED as standalone screen | Chuyển thành dialog/drawer/workflow state của screen cha. |

## Bước Stitch sau khi inventory được duyệt

1. Cập nhật/hợp nhất screen theo mapping, giữ nguyên design language đã audit.
2. Không tạo lại dashboard role-based, RBAC CRUD hoặc department CRUD.
3. Review visual từng screen đã sửa với status/state mới trước khi đánh dấu hoàn thành.
