# 07 — Notification

> Trạng thái: **target, chưa triển khai**.
>
> Module nhận domain event từ các module nghiệp vụ và chuyển thành thông báo theo
> từng channel. Phiên bản đầu hỗ trợ In-App; Email và Transactional Outbox là các
> giai đoạn mở rộng đã định hướng, không nằm trong schema/source hiện tại.

## 1. Goals

- Tách Borrow, Repair, Asset và các module nghiệp vụ khỏi logic tạo thông báo.
- Lưu thông báo trong ứng dụng theo từng người dùng, hỗ trợ đã đọc/chưa đọc.
- Cho phép thêm Email mà không sửa service phát sinh sự kiện nghiệp vụ.
- Cô lập lỗi từng channel; lỗi thông báo không rollback nghiệp vụ đã commit.
- Có đường nâng cấp lên retry bền vững bằng Transactional Outbox khi email trở thành
  yêu cầu phải giao nhận.

## 2. Non-goals

- Giai đoạn đầu không dùng Kafka, RabbitMQ, Saga, SMS hoặc mobile push.
- Không gửi email/notification bên trong Prisma transaction nghiệp vụ.
- Không cho Notification query trực tiếp bảng của Borrow, Repair hoặc Asset.
- Không coi In-App Event Bus giai đoạn đầu là cơ chế bảo đảm giao nhận tuyệt đối.

## 3. Patterns đã chốt

### 3.1 Publisher–Subscriber giữa module nghiệp vụ và Notification

Module nghiệp vụ chỉ publish event:

```text
BorrowService
  └─ publish borrow_request.approved
         └─ NotificationEventHandler
                └─ NotificationService
```

BorrowService không biết thông báo được lưu trong app, gửi email hay có bao nhiêu
listener.

Event envelope chuẩn:

```ts
interface DomainEvent<TPayload> {
  eventId: string;
  type: string;
  occurredAt: Date;
  payload: TPayload;
}
```

### 3.2 Channel Adapter/Strategy bên trong Notification

Các channel tuân theo cùng contract:

```ts
type NotificationChannelName = 'in_app' | 'email';

interface NotificationChannel {
  readonly name: NotificationChannelName;
  send(message: NotificationMessage): Promise<void>;
}
```

Implementation mục tiêu:

```text
NotificationService
├── InAppNotificationChannel  → NotificationRepository
└── EmailNotificationChannel  → EmailProvider
```

Thêm channel mới không yêu cầu sửa BorrowService/RepairService. NotificationService
chọn channel dựa trên loại event và cấu hình/preferences khi tính năng đó được thêm.

### 3.3 Transactional Outbox chỉ khi cần bảo đảm giao nhận

Giai đoạn đầu publish event sau khi transaction commit bằng in-process Event Bus.
Cách này đơn giản nhưng có thể mất event nếu process dừng giữa commit và publish.

Khi email được yêu cầu không được mất:

```text
Business transaction
├── cập nhật dữ liệu nghiệp vụ
└── ghi outbox_event
       ↓ commit
Outbox worker
├── đọc event chưa xử lý
├── dispatch tới Notification listener
├── retry nếu lỗi
└── đánh dấu đã xử lý
```

Outbox consumer phải idempotent theo `eventId`, vì một event có thể được giao lại.
Việc nâng cấp không thay đổi event name/payload hoặc tạo dependency từ module nghiệp
vụ sang Notification.

## 4. Data model mục tiêu

> Các bảng dưới đây chưa tồn tại trong Prisma schema. Chỉ tạo migration khi bắt đầu
> implement đúng giai đoạn.

### Phase 1 — `notifications`

| Field | Ý nghĩa |
|---|---|
| `id` | Khóa chính |
| `user_id` | Người nhận; FK tới `users.id` |
| `event_id` | ID event nguồn, dùng chống tạo trùng |
| `type` | Loại thông báo, ví dụ `borrow_request.approved` |
| `title` | Tiêu đề hiển thị |
| `content` | Nội dung hiển thị |
| `data` | JSON metadata điều hướng, nullable |
| `read_at` | `null` nếu chưa đọc |
| `created_at` | Thời điểm tạo |

Ràng buộc/index dự kiến:

- Unique `(user_id, event_id)` để listener idempotent theo người nhận.
- Index `(user_id, read_at, created_at)` cho danh sách và unread count.

### Phase 2 — `notification_deliveries`

Chỉ thêm khi cần theo dõi từng channel:

| Field | Ý nghĩa |
|---|---|
| `id` | Khóa chính |
| `notification_id` | Notification logic được gửi |
| `channel` | `in_app`, `email`, ... |
| `status` | `pending`, `sent`, `failed` |
| `attempt_count` | Số lần thử |
| `last_error` | Lỗi cuối đã lọc, nullable |
| `sent_at` | Thời điểm gửi thành công, nullable |
| `created_at` | Thời điểm tạo |

### Phase 3 — `outbox_events`

Chỉ thêm khi cần delivery guarantee/retry bền vững. Schema cụ thể được chốt trong
feature spec riêng khi bắt đầu triển khai để phù hợp worker và chiến lược polling.

## 5. Module boundaries

- Notification sở hữu `notifications` và `notification_deliveries`.
- Hạ tầng event sở hữu cơ chế dispatch/outbox; không chứa template nghiệp vụ.
- Module phát event sở hữu tên và ý nghĩa event.
- Notification handler sở hữu việc map event thành title/content/channel.
- Notification chỉ dùng event payload chuẩn. Nếu cần email/trạng thái user, nó gọi
  public query/application port của Users.
- Notification không import Prisma repository của module khác.

## 6. Luồng triển khai theo giai đoạn

### Phase 1 — In-App

1. Business transaction hoàn tất.
2. Service publish event bằng in-process Event Bus.
3. Notification handler nhận event và tạo `NotificationMessage`.
4. `InAppNotificationChannel` lưu `notifications`.
5. Frontend đọc API, hiển thị unread count và đánh dấu đã đọc.

### Phase 2 — Email best-effort

1. Thêm `EmailNotificationChannel` sau cùng channel contract.
2. Email provider chạy ngoài business transaction.
3. Các channel được xử lý độc lập bằng `Promise.allSettled`.
4. Lỗi email được log/theo dõi và không làm mất In-App notification.

### Phase 3 — Email delivery guarantee

1. Business transaction ghi thêm outbox event trong cùng transaction.
2. Worker dispatch event sau commit.
3. Delivery thất bại được retry có giới hạn.
4. Consumer kiểm tra `eventId` để không tạo/gửi trùng ngoài ý muốn.

## 7. API mục tiêu cho In-App

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/api/notifications` | Danh sách notification của user hiện tại |
| `GET` | `/api/notifications/unread-count` | Số notification chưa đọc |
| `PATCH` | `/api/notifications/:id/read` | Đánh dấu notification của chính user là đã đọc |
| `PATCH` | `/api/notifications/read-all` | Đánh dấu tất cả của chính user là đã đọc |

Tất cả endpoint yêu cầu `requireAuth`. Repository luôn scope bằng `req.auth.sub`
được truyền qua service; client không được gửi `userId` để đọc/sửa notification của
người khác.

## 8. Acceptance Criteria (EARS)

### Ubiquitous

- REQ-0701: The system shall không để module nghiệp vụ phụ thuộc NotificationService,
  email provider hoặc NotificationRepository.
- REQ-0702: The system shall chỉ trả notification thuộc user đang xác thực.
- REQ-0703: The system shall không gửi email hoặc gọi external provider bên trong
  Prisma business transaction.

### Event-driven

- REQ-0710: When một subscribed domain event được publish sau commit, the system
  shall tạo tối đa một In-App notification cho mỗi `(userId, eventId)`.
- REQ-0711: When Email channel được bật cho một notification, the system shall xử lý
  Email độc lập với In-App channel.
- REQ-0712: When user đánh dấu notification của chính mình là đã đọc, the system
  shall đặt `read_at` và không thay đổi notification của user khác.

### Unwanted behavior

- REQ-0730: If business transaction rollback, then the system shall không publish
  hoặc tạo notification từ transaction đó.
- REQ-0731: If một listener/channel thất bại sau business commit, then the system
  shall log lỗi và không đổi kết quả nghiệp vụ đã commit thành lỗi.
- REQ-0732: If user yêu cầu đọc hoặc sửa notification không thuộc mình, then the
  system shall trả `404 Not Found` và không tiết lộ notification có tồn tại cho user
  khác.
- REQ-0733: If cùng `eventId` được xử lý lại, then the system shall không tạo trùng
  In-App notification cho cùng user.

## 9. Events consumed ban đầu

- `borrow_request.created`
- `borrow_request.approved`
- `borrow_request.rejected`
- `asset.returned`
- `asset.status_changed`
- `repair.started`
- `repair.completed`

Không phải mọi event đều bắt buộc gửi qua tất cả channel. Mapping người nhận,
template và channel được chốt khi lập feature spec triển khai.

## 10. Đầu việc chưa triển khai

- [ ] In-process Event Bus và event envelope chuẩn.
- [ ] Prisma model/migration cho `notifications`.
- [ ] Notification repository/service/controller/routes.
- [ ] In-App event handlers và template mapping.
- [ ] Frontend notification center/unread badge.
- [ ] Email provider và `EmailNotificationChannel`.
- [ ] `notification_deliveries` và retry policy.
- [ ] Transactional Outbox + worker khi có yêu cầu delivery guarantee.

## 11. Câu hỏi mở trước khi implement

- [ ] Email provider nào sẽ được dùng?
- [ ] Event nào gửi In-App, event nào gửi cả Email?
- [ ] User có được cấu hình notification preference không?
- [ ] Notification giữ bao lâu và có cần job dọn dữ liệu không?
