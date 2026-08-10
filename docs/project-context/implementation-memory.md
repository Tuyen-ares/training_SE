# Implementation Memory

Đây là technical memory có chọn lọc, không phải changelog. Chỉ ghi thông tin có
giá trị lâu dài cho việc đọc, triển khai và debug project.

## Architecture Decisions

- Authorization dựa trên effective permission, không hard-code role name.
- Một user có thể có nhiều role; effective permissions là union permission của các role.
- Flat RBAC: Admin không tự động inherit Manager nếu chưa được gán permission.
- Approval không đồng nghĩa với Handover.
- Asset chỉ chuyển sang `BORROWED` khi handover thực tế được xác nhận.
- Asset `RESERVED` có thể được giải phóng khi request được thu hồi hợp lệ trước handover.
- `borrow_histories` là nguồn xác định handover/return thực tế trong MVP.
- Normal return cập nhật history và asset state trong cùng workflow transaction.
- Report Issue tạo `REPORTED` và chưa tự đổi asset sang `DAMAGED`.
- Confirm Issue mới chuyển issue sang `CONFIRMED` và asset sang `DAMAGED`.
- Repair thất bại không tự chuyển asset sang `RETIRED`.
- QR dùng để identify/lookup asset, không phải nghiệp vụ inventory/stocktake.
- `department_id` là organizational ownership, không phải location.
- Inventory/stocktake không thuộc MVP.
- Future design nằm trong [`../future/`](../future/) và không được tự implement.
- `users.user_code` là định danh nghiệp vụ immutable theo format `BI[YY][Sequence]`; `YY` là năm account được cấp mã lần đầu theo `Asia/Ho_Chi_Minh`, sequence riêng theo năm và không tái sử dụng.
- User legacy được backfill năm 2026 theo `users.id ASC`; bảng `user_code_sequences` giữ sequence cuối để user mới tiếp tục đúng chuỗi. User code không được dùng làm PK/FK.
- Migration backfill dùng temporary staging table có primary key vì database runtime bật `sql_require_primary_key`.

## Important Business/Technical Gotchas

- Approve All có thể partial success; detail không giữ được asset không tự chuyển `REJECTED`.
- Cancel/withdraw request bị chặn nếu request đã có actual handover history; không chỉ dựa trên current asset status.
- `received_by` là người có quyền tiếp nhận asset khi trả, không phải employee mượn.
- `asset_issues.status = REPORTED` chưa đủ để kết luận asset đã hỏng.
- State transition cần được kiểm tra trong service và transaction, không chỉ ở UI.
- HTTP `409` dành cho state/concurrency conflict theo contract hiện tại.
- Notification recipient được xác định theo permission/entity, không hard-code role name.
- F06 current permission namespace is `asset_issue.report/view/create/update/close`; legacy `repair_log.*` is not a runtime permission.
- Confirm Issue accepts only a `REPORTED` issue whose asset is `AVAILABLE` or `BORROWED`; it does not broaden to `RESERVED`, `IN_REPAIR` or `RETIRED`.
- Damaged Return is one F05/F06 transaction: history is returned with `DAMAGED`, asset becomes `DAMAGED`, a `CONFIRMED` issue is created, and the response includes its `issueId`.

## Deployment Gotchas

- Backend production cần chạy Prisma generate trước build khi generated client không được commit.
- Backend phải bind vào `process.env.PORT` để platform như Render nhận diện port.
- Frontend deployment cần cấu hình SPA fallback để refresh deep link không trả 404.
- Session restore ở initial navigation có thể chờ backend; cần phân biệt loading, expired session và backend unavailable.

Các ghi chú deployment trên chỉ là context; khi sửa phải kiểm tra log/config thực tế.

## Current Known Gaps

### Evidence, accessory và acknowledgement chưa có trong MVP schema

- **Gap:** Chưa có attachment/media, accessory checklist, receipt hoặc electronic acknowledgement cho handover/return/repair.
- **Feature:** F05/F06; future scope xem [`../future/scale-system.md`](../future/scale-system.md).
- **Evidence:** [`schema.prisma`](../../apps/backend/prisma/schema.prisma) hiện chỉ có lifecycle fields trong `borrow_histories` và repair fields trong `asset_issues`.
- **Impact:** Cần requirement và migration riêng nếu mở rộng ITAM evidence.
- **Status:** Future candidate; không implement từ future docs.

## Important Recent Decisions

### 2026-08-10 — Gom active-status thành một API PATCH

**Feature:** F08 Administration.

**Decision:** Dùng `PATCH /api/users/:userId/status` với body `isActive: boolean` cho cả kích hoạt
và vô hiệu hóa. Quyền được kiểm tra theo capability tương ứng: `user.update` khi kích hoạt và
`user.delete` khi vô hiệu hóa; không dùng DELETE cho nghiệp vụ đổi trạng thái.

**Reason:** Một API thống nhất nhưng vẫn giữ được phân quyền khác nhau cho hai hành động.

**Affected areas:** User routes/controller/service, User Management frontend, OpenAPI/API catalog và
integration test.

**Verification:** Backend typecheck/unit tests và frontend build; integration test có coverage cho
status PATCH và permission mismatch.

### 2026-08-09 — Chuẩn hóa permission F06 và tích hợp Damaged Return

**Feature:** F05/F06/RBAC.

**Decision:** Thay hoàn toàn runtime permission `repair_log.*` bằng `asset_issue.*` trong migration,
route, service, frontend và tests; migration giữ permission ID/role assignment khi có thể. Damaged
Return dùng một transaction để cập nhật history, asset, confirmed issue và notifications, trả `issueId`.

**Reason:** Giữ capability-based authorization nhất quán và không để trạng thái trả/asset/issue lệch nhau.

**Affected areas:** `apps/backend`, `apps/frontend`, `docs/contracts`, permission registry, F06 guide.

**Verification:** Backend typecheck; integration coverage cho reject, fail repair và damaged return.

### 2026-08-09 — Tách future design khỏi MVP

**Feature:** Project documentation.

**Decision:** Tài liệu ITAM mở rộng nằm trong `docs/future/`, đánh dấu `FUTURE / NOT IMPLEMENTED`,
và không được dùng để tự động sửa requirement, contract, schema hoặc code MVP.

**Reason:** Tránh future behavior âm thầm trở thành scope hiện tại.

**Affected areas:** `docs/future/`, workflow trong `AGENTS.md`.

**Verification:** Kiểm tra tree và git diff chỉ chứa documentation.

### 2026-08-09 — Manager/Admin có thể sở hữu capability IT operations

**Feature:** F05/F06/RBAC.

**Decision:** Chưa cần role IT Support riêng; quyền được cấp bằng effective permissions. Có thể
thêm role sau mà không hard-code role vào business logic.

**Reason:** Giữ business actor trung lập và phù hợp flat RBAC hiện tại.

**Affected areas:** Permission assignment, F05/F06 authorization, future scale design.

**Verification:** Đối chiếu với actor fields tham chiếu `users` và nguyên tắc permission-based access.

### 2026-08-09 — Borrowing Purpose là bắt buộc

**Feature:** F03 Borrow Request.

**Decision:** `borrow_requests.note` (Borrowing Purpose) phải là chuỗi sau khi trim,
từ 1 đến 2.000 ký tự. Frontend validate để phản hồi sớm; backend Zod schema là
biên bảo vệ bắt buộc; database giữ cột `NOT NULL`. Migration backfill các request
legacy chưa có purpose bằng nhãn minh bạch trước khi đổi nullability.

**Reason:** Dấu bắt buộc trên form phải khớp với API contract và dữ liệu persisted,
không cho phép request mới được tạo với purpose rỗng.

**Affected areas:** F03 requirements/contracts, borrow request form/controller/DTO,
Prisma schema and migration, integration validation coverage.
