# Notification Queue và Transactional Outbox

Tài liệu này giải thích hai bảng mới của hệ thống thông báo theo cách dành cho
người mới bắt đầu:

- outbox_events: lưu việc gì vừa xảy ra trong nghiệp vụ.
- notification_messages: lưu event_type, phiên bản template và payload JSON nhỏ để render.
- notification_deliveries: lưu phải gửi message nào cho ai, qua kênh nào.

> **Lưu ý:** Database vẫn là nguồn sự thật bền vững. RabbitMQ là transport
> tùy chọn cho notification_deliveries; RABBITMQ_ENABLED=false giữ delivery
> loop đọc database, còn READY chuyển delivery sang publisher/consumer RabbitMQ.
> Domain event vẫn luôn đi qua outbox_events.

## Catalog domain event và email snapshot

Notification hiện có 14 event active: `borrow_request.created`,
`borrow_request.approval_summary`, `borrow_request_detail.approved`,
`borrow_request_detail.rejected`, `borrow_history.handed_over`,
`borrow_history.returned`, `borrow_history.returned_damaged`,
`asset_issue.reported`, `asset_issue.created_from_damaged_return`,
`asset_issue.confirmed`, `asset_issue.rejected`, `asset_issue.repair_started`,
`asset_issue.repair_completed` và `asset_issue.repair_failed`.

`notification_messages.payload` chỉ lưu JSON snapshot compact của event, không
lưu HTML, logo hay secret. Template email tiếng Anh được render khi gửi, dùng
`Asia/Ho_Chi_Minh` để hiển thị thời gian, escape toàn bộ dữ liệu nghiệp vụ và
dùng `APP_PUBLIC_URL` cho deep link. Nếu `EMAIL_BRAND_LOGO_URL` không hợp lệ
hoặc bị bỏ trống, email dùng text fallback `BigIn Asset`.

Approve một detail tạo một notification riêng. Approve All vẫn ghi audit event
cho từng detail approved nhưng chỉ tạo một `borrow_request.approval_summary`
với danh sách approved/skipped; detail event bulk được đánh dấu suppress để
không tạo email riêng. Nếu không có detail nào approved thì không tạo summary.

## Bức tranh tổng quát

```text
Nghiệp vụ thành công
        |
        v
outbox_events
(một sự kiện đã xảy ra)
        |
        | Observer xác định người nhận và tạo message
        v
notification_messages
(payload JSON, không chứa HTML)
        |
        v
notification_deliveries
(mỗi người nhận + mỗi kênh là một dòng)
        |
        v
Delivery publisher -> RabbitMQ topic exchange -> channel queue
        |
        +---- IN_APP consumer ----> notifications
        |
        +---- EMAIL consumer -----> SMTP provider
```

Ví dụ: yêu cầu mượn tài sản được duyệt là **một sự kiện**. Nếu cần báo cho một
người bằng cả in-app và email thì sự kiện đó tạo ra **hai delivery**.

## Bảng `outbox_events`

### Bảng này dùng để làm gì?

Bảng này bảo đảm thay đổi nghiệp vụ và việc ghi nhận sự kiện cùng thành công
hoặc cùng thất bại trong một database transaction.

Ví dụ, khi duyệt yêu cầu mượn:

1. Database cập nhật trạng thái yêu cầu thành `approved`.
2. Database thêm sự kiện `borrow_request_detail.approved` vào `outbox_events`.
3. Nếu một trong hai bước lỗi, toàn bộ transaction rollback.

Nhờ vậy hệ thống không rơi vào trường hợp nghiệp vụ đã thành công nhưng quên
ghi nhận việc cần gửi thông báo.

### Ý nghĩa từng trường

| Trường | Kiểu/khả năng null | Dùng để làm gì? |
| --- | --- | --- |
| `id` | `BIGINT`, bắt buộc | Khóa chính tăng tự động của dòng trong database. Đây là ID nội bộ, không phải ID nghiệp vụ. |
| `event_id` | `VARCHAR(36)`, bắt buộc, unique | Mã định danh duy nhất của sự kiện, thường là UUID. Worker dùng nó để chống xử lý/truyền sự kiện trùng. |
| `event_type` | `VARCHAR(120)`, bắt buộc | Tên loại sự kiện, ví dụ `borrow_request_detail.approved`. Nó cho Observer biết phải tạo loại thông báo nào. |
| `event_version` | `INT`, mặc định `1` | Phiên bản cấu trúc payload. Khi cấu trúc dữ liệu thay đổi trong tương lai, worker có thể phân biệt cách đọc phiên bản cũ và mới. |
| `aggregate_type` | `VARCHAR(50)`, bắt buộc | Loại đối tượng nghiệp vụ chính đã phát sinh sự kiện, ví dụ `BORROW_REQUEST`. |
| `aggregate_id` | `INT`, bắt buộc | ID của đối tượng nghiệp vụ chính, ví dụ ID của yêu cầu mượn. Cặp `aggregate_type + aggregate_id` giúp truy vết sự kiện thuộc bản ghi nào. |
| `actor_user_id` | `INT`, có thể null | ID người thực hiện hành động, ví dụ admin đã duyệt. Có thể null nếu hành động do hệ thống tự chạy. Trường này hiện không khai báo foreign key để giữ được lịch sử sự kiện độc lập. |
| `correlation_id` | `VARCHAR(64)`, có thể null | Mã nối nhiều thao tác/log thuộc cùng một request hoặc cùng một luồng xử lý, giúp debug xuyên suốt hệ thống. |
| `payload` | `JSON`, bắt buộc | Dữ liệu cụ thể của sự kiện. Ví dụ có `borrowRequestId`, `requesterUserId` và các ID cần để tạo thông báo. Payload được validate trước khi xử lý. |
| `occurred_at` | `DATETIME(3)`, bắt buộc | Thời điểm sự kiện nghiệp vụ thật sự xảy ra, có độ chính xác tới mili-giây. |
| `status` | enum, mặc định `PENDING` | Trạng thái xử lý của sự kiện: đang chờ, đang xử lý, đã tạo delivery hoặc thất bại vĩnh viễn. |
| `dispatch_attempt_count` | `INT`, mặc định `0` | Số lần worker đã thử dispatch sự kiện. Dùng để giới hạn retry. |
| `next_attempt_at` | `DATETIME(3)`, có thể null | Thời điểm sớm nhất worker được thử lại sau một lỗi tạm thời. Null nghĩa là không có lịch retry cụ thể. |
| `locked_at` | `DATETIME(3)`, có thể null | Thời điểm một worker claim dòng này. Dùng để nhận biết lock đã quá hạn nếu worker chết giữa chừng. |
| `locked_by` | `VARCHAR(100)`, có thể null | ID/tên của worker đang sở hữu lease. Chỉ đúng worker này được finalize hoặc release công việc. |
| `dispatched_at` | `DATETIME(3)`, có thể null | Thời điểm sự kiện đã được materialize thành delivery thành công. |
| `last_error` | `TEXT`, có thể null | Lỗi gần nhất đã được làm sạch để hỗ trợ vận hành/debug; không nên chứa mật khẩu hoặc secret. |
| `created_at` | `DATETIME(3)`, tự tạo | Thời điểm dòng outbox được chèn vào database. |
| `updated_at` | `DATETIME(3)`, tự cập nhật | Thời điểm dòng được cập nhật gần nhất. |

### Các giá trị của `status`

| Trạng thái | Ý nghĩa dễ hiểu |
| --- | --- |
| `PENDING` | Đang chờ worker xử lý hoặc chờ đến `next_attempt_at`. |
| `PROCESSING` | Đã được một worker claim và đang xử lý. |
| `DISPATCHED` | Đã xác định người nhận và hoàn tất bước tạo delivery. Không có người nhận phù hợp thì event vẫn được xem là đã dispatch. |
| `FAILED` | Lỗi vĩnh viễn hoặc đã hết số lần retry, worker không tự thử tiếp. |

### Index quan trọng

| Index/ràng buộc | Mục đích |
| --- | --- |
| `uq_outbox_event_id` | Không cho hai sự kiện có cùng `event_id`. |
| `idx_outbox_due` | Giúp worker tìm nhanh các sự kiện đến hạn xử lý. |
| `idx_outbox_lock` | Giúp tìm lock quá hạn để worker khác reclaim. |
| `idx_outbox_aggregate` | Giúp tra các sự kiện theo đối tượng nghiệp vụ. |

## Bảng notification_messages

### Bảng này dùng để làm gì?

Bảng này là presentation snapshot của một domain event. Nó giữ event_type,
template_version và dữ liệu JSON cần để render. Nó không lưu HTML.

Một event tạo một message logic. Nhiều delivery có thể cùng trỏ tới message đó,
ví dụ một delivery IN_APP và một delivery EMAIL.

| Trường | Kiểu | Mục đích |
| --- | --- | --- |
| id | BIGINT, PK | ID nội bộ của message. |
| event_id | VARCHAR(36), unique | UUID event nguồn; liên kết logic tới outbox_events.event_id. |
| event_type | VARCHAR(120) | Snapshot loại event dùng để chọn template. |
| template_version | INT | Phiên bản format nội dung. |
| payload | JSON | Dữ liệu render, gồm text, deep link hoặc items; có thể có object {} và array []. |
| created_at | DATETIME(3) | Thời điểm tạo snapshot để audit. |

Khóa: PRIMARY KEY (id) và UNIQUE (event_id). Không có index created_at vì runtime
đọc message bằng id. Không tạo template_code và không tạo foreign key event_id
về outbox vì hai bảng có vòng đời cleanup độc lập.

## Bảng `notification_deliveries`

### Bảng này dùng để làm gì?

Bảng này là danh sách công việc gửi thông báo. Mỗi dòng trả lời bốn câu hỏi:

1. Sự kiện nào tạo ra công việc này?
2. Gửi cho người dùng nào?
3. Gửi qua kênh nào?
4. Nội dung chính xác cần gửi là gì?

Địa chỉ đích vẫn được snapshot khi tạo delivery.
Dữ liệu render nằm trong notification_messages; SMTP render HTML tại thời điểm gửi.
notification_deliveries không lưu HTML; delivery cũ không có message payload sẽ
được render lại từ title và text snapshot.

### Ý nghĩa từng trường

| Trường | Kiểu/khả năng null | Dùng để làm gì? |
| --- | --- | --- |
| `id` | `BIGINT`, bắt buộc | Khóa chính tăng tự động của delivery trong database. |
| event_id | VARCHAR(36), bắt buộc | Cho biết delivery được tạo từ sự kiện nào; không phải foreign key tới outbox. |
| message_id | BIGINT, có thể null khi migration | Foreign key tới notification_messages.id, dùng để lấy payload render. |
| `recipient_user_id` | `INT`, bắt buộc, FK | ID người nhận. Đây là foreign key tới `users.id`. |
| `channel` | enum, bắt buộc | Kênh gửi: hiện có `IN_APP` và `EMAIL`. Nếu sau này thêm Slack/Teams thì mở rộng enum và đăng ký handler mới. |
| `status` | enum, mặc định `PENDING` | Trạng thái riêng của lần giao thông báo này. Email lỗi không làm delivery in-app thất bại theo. |
| `recipient_address` | `VARCHAR(255)`, có thể null | Địa chỉ đích đã snapshot. Với email đây là địa chỉ email; với in-app có thể null vì đã có `recipient_user_id`. |
| `notification_type` | `VARCHAR(50)`, bắt buộc | Loại thông báo mà frontend/F07 dùng để phân loại, lọc hoặc hiển thị icon. |
| title_snapshot | VARCHAR(255), bắt buộc | Text fallback cho in-app và delivery cũ; flow mới lấy message. |
| text_body_snapshot | TEXT, bắt buộc | Plain-text fallback cho in-app/delivery cũ. |
| `related_entity_type` | `VARCHAR(50)`, có thể null | Loại đối tượng mà thông báo dẫn tới, ví dụ `BORROW_REQUEST`. |
| `related_entity_id` | `INT`, có thể null | ID đối tượng mà thông báo dẫn tới. Kết hợp với `related_entity_type` để tạo deep link. Không phải foreign key vì có thể trỏ tới nhiều loại bảng khác nhau. |
| `notification_id` | `INT`, có thể null, unique, FK | Với kênh `IN_APP`, đây là ID dòng đã tạo trong bảng `notifications`. Là foreign key tới `notifications.id`. Với email thì để null. |
| `outbound_message_id` | `VARCHAR(255)`, có thể null | ID do BigIn tạo trước khi gọi nhà cung cấp (provider) và giữ ổn định khi thử lại (retry). Với EMAIL, đây là Message-ID đặt trong header email và được tạo theo cách xác định (deterministic: cùng đầu vào luôn cho cùng kết quả). **Không phải foreign key và không trỏ tới bảng nào.** IN_APP để null; channel tương lai như Teams có thể dùng trường này nếu provider hỗ trợ ID do client cấp. |
| `provider_message_id` | `VARCHAR(255)`, có thể null | ID do nhà cung cấp bên ngoài trả về sau khi gửi thành công. Đây là chuỗi tham chiếu để tra log với SMTP/provider; không phải foreign key trong database của BigIn. Sau này Slack/Teams cũng có thể lưu ID provider của chúng tại đây. |
| `attempt_count` | `INT`, mặc định `0` | Số lần worker đã thử gửi delivery. Dùng để quyết định retry hay chuyển sang `FAILED`. |
| `next_attempt_at` | `DATETIME(3)`, có thể null | Thời điểm sớm nhất được retry delivery. |
| `locked_at` | `DATETIME(3)`, có thể null | Thời điểm worker claim delivery. Dùng để phát hiện lease quá hạn. |
| `locked_by` | `VARCHAR(100)`, có thể null | Worker đang sở hữu delivery. Worker cũ không được ghi kết quả sau khi lease bị worker khác reclaim. |
| `sent_at` | `DATETIME(3)`, có thể null | Thời điểm delivery được gửi thành công. |
| `skipped_at` | `DATETIME(3)`, có thể null | Thời điểm hệ thống chủ động bỏ qua delivery. |
| `skip_reason` | `VARCHAR(100)`, có thể null | Lý do bỏ qua, ví dụ `USER_INACTIVE` hoặc `SMTP_DISABLED`. |
| `last_error` | `TEXT`, có thể null | Lỗi gần nhất đã được làm sạch, phục vụ debug và vận hành. |
| `created_at` | `DATETIME(3)`, tự tạo | Thời điểm delivery được tạo. |
| `updated_at` | `DATETIME(3)`, tự cập nhật | Thời điểm delivery được cập nhật gần nhất. |

### Các giá trị của `channel`

| Kênh | Ý nghĩa |
| --- | --- |
| `IN_APP` | Tạo một dòng trong bảng `notifications` để hiện trong giao diện BigIn. |
| EMAIL | SMTP dùng recipient_address và notification_messages.payload; HTML render lúc gửi. |

### Các giá trị của `status`

| Trạng thái | Ý nghĩa dễ hiểu |
| --- | --- |
| `PENDING` | Đang chờ gửi hoặc chờ retry. |
| `PROCESSING` | Đã được một worker claim và đang xử lý. |
| `SENT` | Đã gửi/tạo thông báo thành công. |
| `FAILED` | Không thể gửi và worker sẽ không tự retry nữa. |
| `SKIPPED` | Chủ động không gửi, ví dụ user inactive hoặc SMTP bị tắt. Đây không phải lỗi kỹ thuật. |

### Ràng buộc và quan hệ quan trọng

| Ràng buộc | Mục đích |
| --- | --- |
| fk_delivery_message | FK tới notification_messages.id, ON DELETE RESTRICT. |
| `fk_delivery_user` | Bảo đảm `recipient_user_id` tồn tại trong `users`. Không cho xóa user nếu delivery còn tham chiếu. |
| `fk_delivery_notification` | Nối delivery in-app với `notifications`. Nếu notification bị xóa thì `notification_id` được đặt về null. |
| `uq_delivery_event_recipient_channel` | Một sự kiện chỉ tạo tối đa một delivery cho cùng một user trên cùng một channel. Đây là lớp chống duplicate quan trọng. |
| `uq_delivery_notification` | Một notification in-app chỉ thuộc về tối đa một delivery. |
| idx_delivery_message | Join delivery với message và hỗ trợ cleanup. |
| `idx_delivery_due` | Giúp worker tìm nhanh delivery đến hạn. |
| `idx_delivery_lock` | Giúp tìm delivery có lock quá hạn để reclaim. |
| `idx_delivery_recipient_channel_status` | Giúp tra delivery theo người nhận, kênh và trạng thái. |

## Quan hệ giữa các bảng

```text
outbox_events.event_id
        |
        | liên kết logic
        v
notification_messages.event_id
        |
        | message_id là foreign key
        v
notification_deliveries.message_id
        |
        +-- recipient_user_id --FK--> users.id
        |
        +-- notification_id ----FK--> notifications.id
```

`event_id` không có foreign key là chủ ý: dữ liệu outbox và delivery có thể có
thời hạn lưu khác nhau và được cleanup độc lập. Tính không trùng vẫn được bảo vệ
bởi unique key của mỗi bảng.

## Ví dụ hoàn chỉnh

### Tình huống

Admin có `user_id = 7` duyệt một chi tiết có ID `501` trong yêu cầu mượn
`borrow_request_id = 125` của nhân viên `user_id = 42`. Nhân viên đang active
và có email `an@example.com`.

### Bước 1: Ghi sự kiện vào `outbox_events`

Ví dụ rút gọn của dòng được tạo:

```json
{
  "id": 9001,
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "borrow_request_detail.approved",
  "event_version": 1,
  "aggregate_type": "BORROW_REQUEST_DETAIL",
  "aggregate_id": 501,
  "actor_user_id": 7,
  "correlation_id": "request-8f72",
  "payload": {
    "requestId": 125,
    "requesterId": 42
  },
  "occurred_at": "2026-08-21T10:15:30.000Z",
  "status": "PENDING",
  "dispatch_attempt_count": 0
}
```

Worker claim dòng này, validate payload, tìm người nhận và render template. Sau
khi tạo delivery thành công, dòng outbox sẽ có dạng:

```json
{
  "status": "DISPATCHED",
  "dispatched_at": "2026-08-21T10:15:31.000Z"
}
```

### Bước 2: Tạo notification message

Message lưu event_type, template_version và payload JSON. HTML không được lưu.

### Bước 3: Tạo delivery in-app

```json
{
  "id": 12001,
  "message_id": 11001,
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "recipient_user_id": 42,
  "channel": "IN_APP",
  "status": "PENDING",
  "recipient_address": null,
  "notification_type": "BORROW_DETAIL_APPROVED",
| title_snapshot | VARCHAR(255), bắt buộc | Text fallback cho in-app và delivery cũ; flow mới lấy message. |
| text_body_snapshot | TEXT, bắt buộc | Plain-text fallback cho in-app/delivery cũ. |
  "related_entity_type": "BORROW_REQUEST",
  "related_entity_id": 125,
  "notification_id": null,
  "outbound_message_id": null,
  "provider_message_id": null,
  "attempt_count": 0
}
```

Sau khi handler tạo dòng trong `notifications` có ID `30001`, delivery trở thành:

```json
{
  "status": "SENT",
  "notification_id": 30001,
  "sent_at": "2026-08-21T10:15:32.000Z"
}
```

### Bước 4: Tạo delivery email

```json
{
  "id": 12002,
  "message_id": 11001,
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "recipient_user_id": 42,
  "channel": "EMAIL",
  "status": "PENDING",
  "recipient_address": "an@example.com",
  "notification_type": "BORROW_DETAIL_APPROVED",
| title_snapshot | VARCHAR(255), bắt buộc | Text fallback cho in-app và delivery cũ; flow mới lấy message. |
| text_body_snapshot | TEXT, bắt buộc | Plain-text fallback cho in-app/delivery cũ. |
  "related_entity_type": "BORROW_REQUEST",
  "related_entity_id": 125,
  "notification_id": null,
  "outbound_message_id": "<550e8400-e29b-41d4-a716-446655440000.42@bigin.local>",
  "provider_message_id": null,
  "attempt_count": 0
}
```

SMTP provider gửi thành công và trả về ID `smtp-provider-abc-789`:

```json
{
  "status": "SENT",
  "outbound_message_id": "<550e8400-e29b-41d4-a716-446655440000.42@bigin.local>",
  "provider_message_id": "smtp-provider-abc-789",
  "attempt_count": 1,
  "sent_at": "2026-08-21T10:15:33.000Z"
}
```

Hai ID email có vai trò khác nhau:

- `outbound_message_id`: BigIn tạo **trước khi gửi**, dùng lại khi retry.
- `provider_message_id`: SMTP provider trả về **sau khi gửi thành công**.

Không ID nào trong hai trường trên là foreign key.

## Ví dụ khi không gửi được

### User đã bị khóa

Nếu đây là người nhận trực tiếp nhưng `users.is_active = false`, hệ thống vẫn
tạo delivery để giữ audit trail rồi đánh dấu:

```json
{
  "status": "SKIPPED",
  "skip_reason": "USER_INACTIVE",
  "skipped_at": "2026-08-21T10:15:32.000Z"
}
```

### SMTP đang tắt

Khi `SMTP_ENABLED=false`, delivery email không bị coi là lỗi:

```json
{
  "channel": "EMAIL",
  "status": "SKIPPED",
  "skip_reason": "SMTP_DISABLED"
}
```

### Lỗi mạng tạm thời

Worker lưu lỗi, tăng `attempt_count`, đặt lịch ở `next_attempt_at` và đưa delivery
về `PENDING`. Đến đúng thời điểm, worker sẽ thử lại bằng chính địa chỉ và nội
dung snapshot cũ.

## Nếu sau này thêm Slack hoặc Microsoft Teams

Không nên thêm lần lượt các cột như `slack_message_id`, `teams_message_id` cho
mỗi kênh. Thiết kế hiện tại đã có các phần dùng chung:

- `channel`: xác định handler gửi.
- `recipient_address`: có thể chứa địa chỉ đích phù hợp với kênh.
- `provider_message_id`: lưu ID do provider tương ứng trả về.
- Các trường snapshot: giữ nội dung cần gửi.

`outbound_message_id` là tên dùng chung cho ID do BigIn cấp trước khi gửi.
EMAIL dùng nó làm Message-ID; Teams có thể dùng nếu API hỗ trợ client-assigned
ID. Không cần thêm `slack_message_id` hoặc `teams_message_id`.

## Nguồn sự thật

Tên trường, kiểu dữ liệu và ràng buộc trong tài liệu này được đối chiếu với:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/20260821100000_add_notification_outbox_delivery/migration.sql`
- `apps/backend/prisma/migrations/20260825130000_rename_notification_outbound_message_id/migration.sql
  - apps/backend/prisma/migrations/20260826090000_add_rabbitmq_delivery_leases/migration.sql
  - apps/backend/prisma/migrations/20260826100000_add_notification_messages/migration.sql`

Nếu tài liệu và schema khác nhau, Prisma schema cùng migration là nguồn sự thật.

## RabbitMQ delivery transport

RabbitMQ chỉ vận chuyển delivery đã materialize. Luồng là outbox_events, observer
và template renderer, notification_deliveries, publisher confirm, channel queue,
consumer CAS, rồi notifications hoặc SMTP.

Exchange chính là bigin.notification-deliveries kiểu topic. IN_APP dùng queue
bigin.notifications.in-app.v1 với routing key notification.in_app.delivery.
EMAIL dùng queue bigin.notifications.email.v1 với routing key
notification.email.delivery. Exchange dead-letter là bigin.dead-letter kiểu
direct, có một DLQ riêng cho mỗi channel.

DeliveryJobV1 có schemaVersion 1, deliveryId là chuỗi decimal dương, eventId là
UUID, channel và publishLease. Không truyền outboundMessageId và không đặt
contentEncoding. Header bắt buộc là x-event-id; x-correlation-id chỉ có khi
correlation_id_snapshot khác null.

Publisher claim đặt status PUBLISHING, locked_by là lease pub, locked_at và
next_attempt_at. Confirm ACK chỉ thành công khi không có basic.return. Heartbeat
là CAS theo id, status và lease, cập nhật cả locked_at và next_attempt_at.
Consumer CAS yêu cầu PUBLISHING cùng publishLease, chuyển sang PROCESSING và
tăng attempt_count đúng một lần. Consumer heartbeat chỉ cập nhật locked_at.

Payload sai bị NACK vào DLQ. Delivery không tồn tại, terminal hoặc lease cũ
được ACK. Handler thành công, skip, retry và fail đều ACK message Rabbit sau khi
database đã ghi trạng thái. Lỗi database trước state update không ACK để broker
redeliver. PUBLISHING và PROCESSING stale được reclaim bằng deadline tương ứng.
