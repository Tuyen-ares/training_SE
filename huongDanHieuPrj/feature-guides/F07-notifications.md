# F07 – Notifications

## Bức tranh nghiệp vụ

Notification là hộp thư nội bộ của user. Backend tạo notification từ các event nghiệp vụ; user chỉ xem và đánh dấu notification của chính mình. `related_entity_*` là logical reference, không phải FK.

## Spec cần đọc trước

- [F07 feature](../../docs/mvp-requirements/06-features/F07-notifications.md)
- [US-F07 stories](../../docs/mvp-requirements/07-user-stories/notifications/)
- [Notification API catalog](../../docs/contracts/api-catalog.md)
- [Notification frontend flow](../../docs/delivery/frontend-spec/03-user-flows/07-notifications.md)

### Tóm tắt rule để đọc code

- Chỉ trả notification của `recipient_user_id` hiện tại.
- Mark read phải ghi `is_read` và `read_at`.
- Recipient xác định theo user/permission/entity, không hard-code tên role.
- Mở related entity phải kiểm tra capability và missing/forbidden an toàn.

## Minimum Reading Path

1. [NotificationCenterView.vue](../../apps/frontend/src/views/notifications/NotificationCenterView.vue) – `load`, `markRead`, `markAllRead`, `openRelated`.
2. [notification.service.js](../../apps/frontend/src/services/notification.service.js).
3. [notification.routes.ts](../../apps/backend/src/routes/notification.routes.ts).
4. [notification.service.ts](../../apps/backend/src/services/notification.service.ts).
5. [asset-issue-notification.integration.test.ts](../../apps/backend/tests/asset-issue-notification.integration.test.ts).

## User Story/action chính

- `US-F07-01` – Xem notification list và unread count.
- `US-F07-02` – Mark một hoặc tất cả notification đã đọc.
- `US-F07-03` – Mở entity liên quan bằng logical reference.

## Trace từng action

| User Story/action | Đường trace đầy đủ | Đọc |
|---|---|---|
| `US-F07-01` Xem list/unread | `NotificationCenterView:load` → `listNotifications/getUnreadNotificationCount` → `GET /api/notifications` + `/unread-count` → `notification.routes.ts` (`requireAuth`, không hard-code role) → `NotificationController.listOwn/unreadCount` → `NotificationService.listOwn/getUnreadCount` → `PrismaNotificationRepository.findOwnPage/unreadCount` → Prisma `Notification` → DB `notifications` → `asset-issue-notification.integration.test.ts` | KỸ: ownership query; LƯỚT: tabs |
| `US-F07-02` Mark one/all read | `NotificationCenterView:markRead/markAllRead` → `markNotificationRead/markAllNotificationsRead` → `PATCH /api/notifications/:id/read` hoặc `/read-all` → `notification.routes.ts` (`requireAuth`) → `NotificationController.markRead/markAllRead` → `NotificationService.markRead/markAllRead` → `PrismaNotificationRepository.markRead/markAllRead` → Prisma `Notification.isRead/readAt` → DB `notifications.is_read/read_at` → integration test | KỸ: user scoping; LƯỚT: badge refresh |
| `US-F07-03` Open related | `NotificationCenterView:openRelated` → logical route decision → asset/borrow/issue API qua authStore → related route permission (nếu có) → related controller → related business service → related repository → Prisma related model → DB related table → integration test/safe error state | KỸ: capability/safe missing; LƯỚT: icon/style |

## SPEC EXPECTS

Các event/recipient nghiệp vụ đã được requirement chốt. UI presentation có thể thay đổi nhưng không được biến logical reference thành FK tùy tiện.

## CURRENT CODE

Notification Center, unread badge, mark one/all, related navigation và issue/borrow event creation có code thực tế. Evidence: frontend/backend files trong Minimum Reading Path và integration test.

## GAPS

- Không có frontend automated test suite đầy đủ; browser verification là evidence bổ sung.
- Nếu thêm event mới phải cập nhật requirement/domain mapping trước, không tự thêm chỉ vì UI cần dữ liệu.
