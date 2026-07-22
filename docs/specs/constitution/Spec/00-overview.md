# 00 — Tổng quan hệ thống

## Mô tả

Hệ thống quản lý và cho mượn thiết bị nội bộ, có phân quyền (RBAC) và xác thực
JWT + refresh token rotation. Người dùng gửi yêu cầu mượn thiết bị; người có
quyền duyệt/từ chối; hệ thống theo dõi lịch sử mượn/trả và log sửa chữa.

## Bản đồ module

| # | Module | Bảng | Gốc (aggregate root) | Phụ thuộc |
|---|--------|------|----------------------|-----------|
| 01 | Auth | `users` (đọc), `refresh_tokens` | — | Người dùng |
| 02 | Quản lý thiết bị | `assets`, `asset_models`, `asset_types`, `brands` | `assets` | — (nền tảng) |
| 03 | Người dùng & phòng ban | `users`, `departments` | `users` | — (nền tảng) |
| 04 | Quản trị RBAC | `roles`, `permissions`, `role_permissions`, `user_roles` | — | Người dùng |
| 05 | Mượn / trả | `borrow_requests`, `borrow_request_details`, `borrow_histories` | `borrow_requests` | Thiết bị, Người dùng |
| 06 | Sửa chữa | `repair_logs` | `repair_logs` | Thiết bị, Người dùng |

Hạ tầng dùng chung (không phải module nghiệp vụ): `auth.middleware`,
`rbac.middleware`, `events/bus`.

## Thứ tự build (theo dependency)

1. Hạ tầng: prisma client, event bus, error handler, auth.middleware, rbac.middleware
2. Module nền: 03 Người dùng & phòng ban → 02 Quản lý thiết bị
3. 01 Auth (cần users) → 04 Quản trị RBAC (cần users/roles)
4. 05 Mượn/trả → 06 Sửa chữa (cần cả Thiết bị + Người dùng)

> Review gate: sau khi implement xong module thứ 2, DỪNG lại đối chiếu với module
> mẫu + constitution trước khi làm tiếp phần còn lại.

## State machine

### asset.status (`assets_status`: available | borrowed | damaged | in_repair)

| Từ | Sang | Kích hoạt bởi |
|----|------|---------------|
| available | borrowed | Duyệt đơn mượn chứa asset này |
| borrowed | available | Ghi nhận trả thiết bị (còn tốt) |
| borrowed | damaged | Ghi nhận trả thiết bị bị hỏng |
| available | damaged | Báo hỏng khi đang rảnh |
| damaged | in_repair | Bắt đầu sửa (tạo repair_log) |
| in_repair | available | Sửa xong, thiết bị dùng lại được |
| in_repair | damaged | Sửa xong nhưng vẫn hỏng / không sửa được |

Mọi chuyển khác là KHÔNG hợp lệ → ném `InvalidStateTransitionError`.
Chủ sở hữu transition: module 02 Quản lý thiết bị (qua service).

### borrow_requests.status (`borrow_requests_status`: pending | approved | rejected)

| Từ | Sang | Kích hoạt bởi |
|----|------|---------------|
| pending | approved | Người có quyền duyệt |
| pending | rejected | Người có quyền từ chối |

approved/rejected là trạng thái cuối, không chuyển tiếp. Chủ sở hữu: module 05.

## Domain events (chuẩn — dùng cho Notification sau này)

| Event | Emit ở | Payload chính |
|-------|--------|---------------|
| `borrow_request.created` | 05 | requestId, userId |
| `borrow_request.approved` | 05 | requestId, userId, approverId, assetIds |
| `borrow_request.rejected` | 05 | requestId, userId, approverId, note |
| `asset.returned` | 05 | detailId, assetId, userId, condition |
| `asset.status_changed` | 02 | assetId, from, to |
| `repair.started` | 06 | repairLogId, assetId, handledBy |
| `repair.completed` | 06 | repairLogId, assetId, cost |

> Hiện chưa có listener. Chỉ cần emit đúng chỗ. Module Notification thêm sau.

## Glossary

- Aggregate root: thực thể chính của một module, thứ mọi bảng khác trỏ vào.
- Transition guard: hàm kiểm tra một chuyển trạng thái có hợp lệ không.
- RBAC: phân quyền theo vai trò; kiểm theo `permissions.code`.
- Refresh token rotation: mỗi lần refresh, token cũ bị đánh dấu đã dùng và cấp
  token mới cùng `family_id`; dùng lại token cũ → nghi ngờ đánh cắp → revoke cả family.
- REQ-xxx: mã định danh của một acceptance criteria trong spec module.

## Quy ước đánh số REQ

`REQ-<module><nhóm>` — ví dụ REQ-0510 = module 05, nhóm event-driven, số 10.
Chừa khoảng trống giữa các nhóm để chèn thêm sau.
