# Tasks — Flat RBAC

- [x] RBAC-T01 [REQ-0401] Query role và permission codes phục vụ login.
  - Depends on: RBAC schema
  - Verify: token chứa permission đã làm phẳng/loại trùng
- [x] RBAC-T02 [REQ-0402] Duy trì permission registry khớp database.
  - Depends on: permission decisions
  - Verify: route code đều tồn tại trong registry
- [x] RBAC-T03 [REQ-0410, REQ-0430] Implement replace roles nguyên tử.
  - Depends on: RBAC repository
  - Verify: invalid/rỗng không tạo mapping dở
- [x] RBAC-T04 [REQ-0411] Loại role ID trùng và xử lý idempotent.
  - Depends on: RBAC-T03
  - Verify: composite key không bị duplicate
- [x] RBAC-T05 [REQ-0431] Tách `requirePermission` sang RBAC middleware.
  - Depends on: Auth middleware
  - Verify: thiếu quyền trả 403
- [x] RBAC-T06 [REQ-0433] Tạo GET role options và PUT user roles.
  - Depends on: RBAC-T03, RBAC-T05
  - Verify: endpoint yêu cầu `role.assign`
- [x] RBAC-T07 [REQ-0413] Tích hợp Users/Auth qua RbacService.
  - Depends on: public RbacService contract
  - Verify: module khác không ghi trực tiếp `user_roles`
- [x] RBAC-T08 Bổ sung conditional middleware khi payload User có roleIds.
  - Depends on: Users routes
  - Verify: không roleIds không cần `role.assign`; có roleIds thì cần
- [ ] RBAC-T09 Viết HTTP integration test 401/403 và role ID không tồn tại.
  - Depends on: test app/database
  - Verify: status và dữ liệu DB đúng
- [ ] RBAC-T10 Hoàn thiện frontend role selector/role display.
  - Depends on: RBAC API
  - Verify: chỉ user có `role.assign` thấy/sửa role

## Deferred, không phải task đang chờ

- CRUD role.
- CRUD permission.
- Chỉnh role-permission matrix.
- Super-admin bypass.

Chỉ đưa các mục trên thành task sau khi spec được mở rộng và migration/permission
contract được duyệt.
