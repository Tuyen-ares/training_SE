# 00. Bức tranh toàn cảnh F01–F08

## Quan hệ giữa các Feature

Đọc [MVP context](../../docs/mvp-requirements/00-context.md), [scope](../../docs/mvp-requirements/01-mvp-scope.md) và [traceability](../../docs/mvp-requirements/08-traceability-matrix.md) trước.

```text
F01 Authentication & Access
  └─ đăng nhập, phiên, permission
       ↓ điều kiện truy cập
F02 Asset Management
       ↓ chọn asset
F03 Borrow Request
       ↓ gửi request PENDING
F04 Approval & Reservation
       ↓ approve detail → RESERVED
F05 Handover & Return
       ↓ handover → BORROWED → return
F06 Asset Issues & Repairs
       ↓ xử lý asset hỏng
F07 Notifications
       └─ thông báo các event quan trọng

F08 Administration
  └─ users, role có sẵn, effective permissions dùng xuyên suốt F01–F07
```

## Asset lifecycle

```text
AVAILABLE
  └─ approve detail → RESERVED
       └─ handover → BORROWED
            └─ normal return → AVAILABLE
            └─ damaged return/confirmed issue → DAMAGED
                 └─ start repair → IN_REPAIR
                      ├─ complete → AVAILABLE
                      └─ fail → DAMAGED
```

`RETIRED` là trạng thái ngừng sử dụng do người có quyền quyết định; không tự suy ra từ mọi issue thất bại.

## Borrow lifecycle

```text
Tạo request
→ header PENDING + nhiều detail PENDING
→ approve detail
→ asset RESERVED
→ handover
→ borrow_history được tạo, asset BORROWED
→ return bình thường
→ history có return_date, asset AVAILABLE
```

Approve All là partial success: detail không giữ được asset vẫn `PENDING`, không tự thành `REJECTED`.

## Issue/repair lifecycle

```text
REPORTED
├─ REJECTED
└─ CONFIRMED → IN_REPAIR → COMPLETED/FAILED
```

Báo issue có thể xảy ra khi đang mượn. Trả hỏng là một trường hợp đặc biệt: cập nhật history, tạo issue `CONFIRMED` và chuyển asset sang `DAMAGED` trong một transaction. API combined cho nhánh này hiện cần kiểm tra riêng trong guide F05.

## RBAC và effective permissions

Đọc [Business Rules](../../docs/mvp-requirements/04-business-rules.md), [US-F01-04](../../docs/mvp-requirements/07-user-stories/authentication-access/US-F01-04-access-by-permission.md) và [rbac.middleware.ts](../../apps/backend/src/middleware/rbac.middleware.ts).

```text
user → user_roles → roles → role_permissions → permissions
```

Quyền thực tế là hợp của permissions từ mọi role. Không dùng tên `Admin`, `Manager`, `Employee` để suy ra quyền. Route kiểm tra permission; service kiểm tra ownership, state và transaction.

## Kiến trúc FE → API → BE → DB

```text
Vue View
→ frontend service / authStore.api
→ Express route
→ auth/permission middleware
→ controller
→ business service
→ repository
→ Prisma model
→ MariaDB/MySQL
```

## Thứ tự đọc nhanh nhất

1. F01: biết session, actor và permission.
2. F02: biết asset và trạng thái.
3. F03: biết request/detail.
4. F04: biết reservation và approval transaction.
5. F05: biết history, handover, return.
6. F06: biết issue/repair.
7. F07: biết notification event và recipient.
8. F08: đọc sau để hiểu quản trị user/role; quay lại F01 khi cần hiểu RBAC.

