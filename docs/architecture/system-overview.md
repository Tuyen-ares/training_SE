# 00 — Tổng quan hệ thống

## Mô tả

Hệ thống quản lý và cho mượn thiết bị nội bộ, có phân quyền (RBAC) và xác thực
JWT + refresh token rotation. Người dùng gửi yêu cầu mượn thiết bị; người có
quyền duyệt/từ chối; hệ thống theo dõi lịch sử mượn/trả và log sửa chữa.

## Bản đồ module

Ownership bảng, dependency và public boundary được định nghĩa một lần tại
[`module-boundaries.md`](module-boundaries.md).

Hạ tầng dùng chung (không phải module nghiệp vụ): `auth.middleware`,
`rbac.middleware`, `events/bus` và Prisma client.

## Thứ tự build (theo dependency)

1. Hạ tầng cốt lõi: prisma client, error handler, auth.middleware, rbac.middleware
2. Module nền: 03 Người dùng & phòng ban → 02 Quản lý thiết bị
3. 04 Quản trị RBAC (roles/permissions/user_roles) → 01 Auth (cần users + role mặc định) + phần gán role khi admin tạo user
4. 05 Mượn/trả → 06 Sửa chữa (cần cả Thiết bị + Người dùng)
5. 07 Notification: in-process Event Bus + In-App sau khi luồng Borrow/Repair đầu tiên
   phát event ổn định; Email channel và Transactional Outbox triển khai theo nhu cầu
   tin cậy được chốt trong spec Notification.

> Review gate: sau khi implement xong module thứ 2, DỪNG lại đối chiếu với module
> mẫu + constitution trước khi làm tiếp phần còn lại.

## State machine

### asset.status (`assets_status`: available | reserved | borrowed | damaged | in_repair | retired)

| Từ | Sang | Hành động nghiệp vụ |
|----|------|----------------------|
| available | reserved | `reserve(assetIds)` khi tạo đơn mượn `pending` |
| reserved | borrowed | `markBorrowed(assetIds)` khi duyệt đơn |
| reserved | available | `releaseReservation(assetIds)` khi từ chối/hủy đơn |
| borrowed | available | `returnAsset(assetId, 'good')` |
| borrowed | damaged | `returnAsset(assetId, 'damaged')` |
| available | damaged | `reportDamaged(assetId)` |
| damaged | in_repair | `startRepair(assetId)` |
| in_repair | available | `completeRepair(assetId, 'repaired')` |
| in_repair | damaged | `completeRepair(assetId, 'failed')` |
| available | retired | Ngừng sử dụng/xóa asset |
| damaged | retired | Ngừng sử dụng asset không còn sửa/khai thác |

Mọi chuyển khác là KHÔNG hợp lệ → ném `InvalidStateTransitionError`.
Chủ sở hữu transition: module 02 Quản lý thiết bị (qua service).
`retired` là trạng thái cuối; asset retired không được mượn, trả, báo hỏng hay sửa tiếp.

```text
available
├── reserve ──────────────────────────→ reserved
├── reportDamaged ────────────────────→ damaged
└── retire ───────────────────────────→ retired

reserved
├── markBorrowed ─────────────────────→ borrowed
└── releaseReservation ───────────────→ available

borrowed
├── returnAsset(good) ────────────────→ available
└── returnAsset(damaged) ─────────────→ damaged

damaged
├── startRepair ──────────────────────→ in_repair
└── retire ───────────────────────────→ retired

in_repair
├── completeRepair(repaired) ─────────→ available
└── completeRepair(failed) ───────────→ damaged

retired (terminal)
```

### borrow_requests.status (`borrow_requests_status`: pending | approved | rejected)

| Từ | Sang | Kích hoạt bởi |
|----|------|---------------|
| pending | approved | Người có quyền duyệt |
| pending | rejected | Người có quyền từ chối |

approved/rejected là trạng thái cuối, không chuyển tiếp. Chủ sở hữu: module 05.

## Domain events (active notification outbox catalog)

| Event | Emit ở | Payload chính |
|-------|--------|---------------|
| `borrow_request.created` | 03 | requestId, requesterId |
| `borrow_request.approval_summary` | 04 | requestId, requesterId, approvalItems |
| `borrow_request_detail.approved` | 04 | requestId, requesterId |
| `borrow_request_detail.rejected` | 04 | requestId, requesterId |
| `borrow_history.handed_over` | 05 | requestId, requesterId |
| `borrow_history.returned` | 05 | requestId, requesterId |
| `borrow_history.returned_damaged` | 05 | requestId, requesterId |
| `asset_issue.reported` | 06 | issueId, reporterId |
| `asset_issue.created_from_damaged_return` | 05/06 | issueId, reporterId |
| `asset_issue.confirmed` | 06 | issueId, reporterId |
| `asset_issue.rejected` | 06 | issueId, reporterId |
| `asset_issue.repair_started` | 06 | issueId, reporterId |
| `asset_issue.repair_completed` | 06 | issueId, reporterId |
| `asset_issue.repair_failed` | 06 | issueId, reporterId |

> Notification hiện dùng Transactional Outbox và Observer dispatch trong cùng
> Node.js process; In-App và SMTP là delivery handlers. Chi tiết được chốt tại
> [`../modules/notifications/spec.md`](../modules/notifications/spec.md).

## Glossary

- Aggregate root: thực thể chính của một module, thứ mọi bảng khác trỏ vào.
- Transition guard: hàm kiểm tra một chuyển trạng thái có hợp lệ không.
- RBAC: phân quyền theo vai trò; kiểm theo `permissions.code`.
- Permission registry: danh sách mã quyền ổn định trong `permission-registry.md`; bảng
  `permissions` là dữ liệu runtime và phải được seed/migrate khớp registry.
- Prisma interactive transaction: service dùng `prisma.$transaction(async (tx) => ...)`
  và truyền cùng `tx` xuống các repository/service để mọi bước cùng commit hoặc rollback.
- Refresh token rotation: mỗi lần refresh, token cũ bị đánh dấu đã dùng và cấp
  token mới cùng `family_id`; dùng lại token cũ → nghi ngờ đánh cắp → revoke cả family.
- Publisher–Subscriber: module nghiệp vụ publish event mà không cần biết Notification
  hay channel nào đang lắng nghe.
- Notification channel handler: Strategy implementation gửi qua `IN_APP`, `EMAIL`
  hoặc channel khác sau cùng một contract.
- Transactional Outbox: ghi event vào bảng outbox trong cùng business transaction,
  rồi worker dispatch sau commit để giảm nguy cơ mất event và hỗ trợ retry.
- REQ-xxx: mã định danh của một acceptance criteria trong spec module.

## Quy ước đánh số REQ

`REQ-<module><nhóm>` — ví dụ REQ-0510 = module 05, nhóm event-driven, số 10.
Chừa khoảng trống giữa các nhóm để chèn thêm sau.
