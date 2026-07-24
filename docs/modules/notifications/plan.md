# Plan — Notification

> Input: [`spec.md`](spec.md). Triển khai theo phase; không tạo email/outbox ngay
> trong phase In-App.

## 1. Phạm vi theo giai đoạn

### Phase 1

- In-process Event Bus và event envelope chuẩn.
- Business service publish event sau transaction commit.
- In-App notification persistence/API/UI.
- Idempotency theo `(userId, eventId)`.

### Phase 2

- Channel abstraction.
- Email provider best-effort.
- Tách lỗi channel bằng `Promise.allSettled`.

### Phase 3

- Transactional Outbox + worker/retry khi delivery guarantee trở thành yêu cầu.

## 2. Kiến trúc và ownership

```text
Borrow/Repair/Asset service
  → EventBus.publish(domainEvent) sau commit
    → NotificationEventHandler
      → NotificationService
        ├─ InAppNotificationChannel → NotificationRepository
        └─ EmailNotificationChannel → EmailProvider (phase 2)
```

- Event infrastructure không thuộc Notification domain.
- Module nguồn sở hữu event name/payload.
- Notification sở hữu mapping template, recipient và channel.
- Notification không query trực tiếp repository của Borrow/Repair/Asset.

## 3. API Phase 1

| Method | Endpoint | Auth | Mục đích |
|---|---|---|---|
| GET | `/api/notifications` | current user | Danh sách có pagination |
| GET | `/api/notifications/unread-count` | current user | Unread badge |
| PATCH | `/api/notifications/:id/read` | owner | Đánh dấu đã đọc |
| PATCH | `/api/notifications/read-all` | current user | Đọc tất cả |

User ID luôn lấy từ `req.auth.sub`, không nhận từ body/query.

## 4. Data và migration

### Phase 1

- `notifications`: user_id, event_id, type, title, content, data, read_at, created_at.
- Unique `(user_id, event_id)`.
- Index `(user_id, read_at, created_at)`.

### Phase 2/3

- Chỉ thêm `notification_deliveries` khi cần trạng thái từng channel.
- Chỉ thêm `outbox_events` khi chốt delivery guarantee và worker lifecycle.

## 5. Event flow và failure handling

1. Business transaction trả về event(s).
2. Transaction promise resolve thành công.
3. Service gọi EventBus.
4. EventBus chạy listener bằng cơ chế cô lập lỗi.
5. In-App handler map event → recipient/message và lưu idempotent.
6. Listener lỗi được log; không đổi business response đã commit.

Phase 1 chấp nhận rủi ro mất event nếu process chết giữa commit/publish. Không mô tả
phase 1 là guaranteed delivery.

## 6. Security và privacy

- Repository luôn scope user hiện tại.
- Read notification người khác trả 404 để không lộ tồn tại.
- Payload event không chứa password/token/secrets.
- Email template không nhúng dữ liệu không cần thiết.
- CORS/CSRF thuộc HTTP security chung, không giải quyết bằng Event Bus.

## 7. Test strategy

- Unit EventBus: nhiều listener, listener fail, allSettled behavior.
- Unit template handlers: event → message/recipient.
- Repository integration: unique idempotency, ownership, unread count.
- HTTP integration: user isolation, read/read-all.
- Phase 2: fake EmailProvider, failure isolation.
- Phase 3: worker retry/idempotency/restart.

## 8. Thứ tự triển khai

1. Chốt event-recipient/template matrix của phase 1.
2. Tạo Event Bus contract/implementation và tests.
3. Tích hợp một event Borrow sau commit.
4. Tạo notification migration.
5. Repository/service/controller/routes.
6. Handler/template mapping.
7. Frontend center + unread badge.
8. Tích hợp các event còn lại.
9. Chỉ sau đó đánh giá Email phase 2.
10. Chỉ khi cần guarantee mới lập plan outbox phase 3.

## 9. Không làm

- Không publish trước khi business transaction commit.
- Không để Borrow/Repair import NotificationService.
- Không gửi email trong transaction.
- Không dùng Kafka/RabbitMQ/Saga ở giai đoạn đầu.
- Không tạo bảng delivery/outbox khi chưa có use case.
- Không để lỗi listener rollback nghiệp vụ đã commit.
