# Project Constitution — Hệ thống mượn thiết bị

> File này chứa các luật BẤT BIẾN cho toàn dự án. Mọi module phải tuân theo.
> Agent (Codex) đọc file này TRƯỚC KHI làm bất kỳ task nào. Nếu spec module mâu
> thuẫn với constitution, constitution thắng — trừ khi được sửa tường minh ở đây.

---

## 1. Tech stack (cố định)

- Runtime: Node.js + Express
- ORM: Prisma (MySQL)
- Auth: JWT (access token) + refresh token rotation (bảng `refresh_tokens`)
- Ngôn ngữ: TypeScript
- Validation: Zod

> Không đổi stack, không thêm framework nặng (không NestJS, không thêm ORM khác).

## 2. Cấu trúc thư mục

```
src/
  events/
    bus.ts                       # target: in-process bus, chưa triển khai
    domain-event.ts              # target: DomainEvent và payload type chuẩn
  controllers/
    <module>.controller.ts       # HTTP request/response
  middleware/
    auth.middleware.ts           # verify JWT, gắn req.auth, check permission
  models/
    <module>.model.ts            # model, DTO và application types
  repositories/
    <module>.repository.ts       # repository contract
    <module>.prisma.repository.ts # Prisma implementation
  routes/
    <module>.routes.ts           # path, middleware và manual DI
  services/
    <module>.service.ts          # business logic
  shared/
    api-response.ts
    app-error.ts
    base.controller.ts
    base.repository.ts
    base.service.ts
    request-validation.ts
    rest-router.ts
  types/
    express.d.ts                 # mở rộng Express.Request
  prisma.ts                      # PrismaClient singleton
  app.ts
```

Các module được tách theo layer dùng chung như codebase hiện tại. Mọi file mới dùng
TypeScript, path alias `@/*` và import nội bộ có đuôi `.js` để tương thích NodeNext.

Mọi module mới phải theo đúng cấu trúc và cách đặt tên của module mẫu đã hoàn thiện.

## 3. Phân tầng (bắt buộc)

Luồng phụ thuộc một chiều:

```text
routes → controllers → services → repositories → Prisma → MySQL
```

- `routes` — khai báo path, gắn middleware và khởi tạo dependency bằng manual DI.
- `controller` — nhận request, validate input, gọi service, trả response. KHÔNG chứa business logic.
- `service` — chứa business logic, gọi repository và phát event. Không thực hiện
  Prisma model query trực tiếp.
- Ngoại lệ duy nhất: service điều phối use case nhiều repository/module được gọi
  `prisma.$transaction(async (tx) => ...)` trên PrismaClient được inject, rồi truyền
  cùng `tx` xuống repository/service liên quan. Service vẫn không được gọi
  `tx.users.*`, `tx.assets.*` hay model query nào.
- `repository contract` — định nghĩa dữ liệu vào/ra mà service cần. Method tham gia
  interactive transaction được nhận `tx: Prisma.TransactionClient`.
- `Prisma repository` — nơi duy nhất được gọi Prisma và mapping dữ liệu persistence.
- Service KHÔNG đọc `req`/`res`; repository KHÔNG quyết định HTTP status/response.
- Controller KHÔNG gọi Prisma. Service chỉ được dùng Prisma cho `$transaction` theo
  ngoại lệ nêu trên; mọi query vẫn phải qua repository.

## 4. Ranh giới module (QUAN TRỌNG NHẤT)

- Một module KHÔNG được `require` hay update trực tiếp bảng của module khác.
- Muốn tác động dữ liệu của module khác → gọi **service** của module đó.
- Service của một module chỉ phụ thuộc repository contract thuộc phạm vi module đó.
- Use case liên module được phụ thuộc public service/application port của module sở hữu,
  nhưng không được phụ thuộc repository implementation của module đó.
- Không import Prisma repository của module khác để đi vòng qua service.
- Cụ thể: chỉ module Thiết bị được đổi `assets.status`. Module Mượn/trả và Sửa chữa
  muốn đổi trạng thái asset thì gọi `assetService.markBorrowed()`,
  `assetService.returnAsset()`, `assetService.reportDamaged()`,
  `assetService.startRepair()`, `assetService.completeRepair()`.
  KHÔNG tự `prisma.assets.update({ status })` từ ngoài module Thiết bị.
- User không dùng soft-delete: trạng thái hoạt động được quản lý bằng
  `users.is_active`; thao tác ngừng tài khoản đặt `is_active=false` và giữ row lịch sử.
- Asset không dùng soft-delete: thao tác xóa/ngừng sử dụng đổi `assets.status` sang
  `retired`. Không xóa vật lý asset còn lịch sử.
- Các quyết định trên yêu cầu migration bổ sung `users.is_active` và giá trị
  `retired` vào enum `assets_status` trước khi implement.
- Lookup như department/brand/type/model chỉ được hard-delete khi không còn tham chiếu.

## 5. Chuyển trạng thái (state transition)

- Hai enum có luật chuyển trạng thái: `assets.status`, `borrow_requests.status`.
- Mỗi chuyển trạng thái PHẢI đi qua một guard kiểm tra transition hợp lệ, đặt trong
  service chủ của bảng đó. Không rải logic "được chuyển từ X sang Y" khắp nơi.
- Nếu transition không hợp lệ → ném lỗi domain (vd `InvalidStateTransitionError`),
  KHÔNG âm thầm bỏ qua.
- Bảng transition hợp lệ xem [`system-overview.md`](system-overview.md).

## 6. Xác thực & phân quyền

- MỌI resource route phải đi qua `requireAuth`, trừ các endpoint xác thực không thể
  yêu cầu access token như login và refresh. Logout có thể xác định phiên bằng
  refresh-token cookie nên không bắt buộc access token còn hạn.
- `requireAuth` verify access token và gắn payload đã validate vào `req.auth`.
- Route cần quyền phải gắn `requirePermission('permission_code')`.
- RBAC kiểm theo `permissions.code` (không hardcode theo role name).
- Registry mã quyền dùng khi phát triển nằm tại
  [`permission-registry.md`](permission-registry.md); dữ liệu runtime
  nằm trong bảng `permissions`. Migration/seed phải giữ hai nơi đồng bộ và code không
  được tự phát minh permission ngoài registry.
- Không tự viết logic verify JWT rải rác — chỉ ở `auth.middleware`.
- Hệ thống hiện hỗ trợ public register. Public register chỉ tạo tài khoản thường với
  role mặc định `staff`, KHÔNG cho client tự chọn role.
- Admin tạo user đi qua `POST /api/users`, phải có `user.create`, và admin được chọn
  role ban đầu cho user nếu có thêm quyền `role.assign`.
- Bảng `user_roles` thuộc RBAC. Module Users/Auth KHÔNG tự ghi trực tiếp
  `user_roles`; nếu cần gán role sau khi tạo user thì gọi `RbacService`.

## 7. Sự kiện nghiệp vụ và Notification — target, chưa triển khai

- Hiện chưa có bảng Notification, listener hoặc event bus. Contract chi tiết nằm tại
  [`../modules/notifications.md`](../modules/notifications.md).
- Module nghiệp vụ chỉ publish domain event; tuyệt đối KHÔNG gọi NotificationService,
  email provider hoặc ghi bảng Notification trực tiếp.
- Event chuẩn có envelope gồm `eventId`, `type`, `occurredAt` và `payload`; danh sách
  event nghiệp vụ xem [`system-overview.md`](system-overview.md).
- Notification dùng Publisher–Subscriber để nhận event và dùng channel
  adapter/strategy để gửi qua từng kênh. Kênh mục tiêu ban đầu là `in_app`; kênh
  `email` được bổ sung sau mà không sửa service phát event.
- `notifications` lưu thông báo logic cho từng người dùng và trạng thái đọc trong app.
  Khi cần theo dõi gửi đa kênh, `notification_deliveries` lưu trạng thái
  `pending|sent|failed`, số lần thử và lỗi cuối của từng channel.
- Không gửi email, gọi HTTP provider hoặc thực hiện công việc chậm bên trong Prisma
  transaction.

### Giai đoạn 1 — In-process Event Bus + In-App Notification

- Event bus đặt tại `src/events/bus.ts`; event envelope/type đặt tại
  `src/events/domain-event.ts`.
- Event phát sinh trong transaction được thu thập và chỉ publish SAU KHI Promise
  `prisma.$transaction(...)` hoàn tất thành công. Không gọi `emit` giữa callback.
- `bus.publish(event)` chạy listener bằng `Promise.allSettled`, log từng listener bị
  reject và không throw lỗi ngược về business flow.
- Lỗi Notification KHÔNG được đổi response thành lỗi hoặc rollback nghiệp vụ đã commit.
- Giai đoạn này chấp nhận event có thể mất nếu process dừng sau commit. Không dùng
  Kafka, RabbitMQ hoặc Saga.

### Giai đoạn 2 — Email channel

- Thêm `EmailNotificationChannel` phía sau cùng NotificationService/channel contract;
  module Borrow, Repair và Asset không thay đổi.
- Email ở giai đoạn đơn giản là best-effort. Lỗi một channel không làm channel khác
  thất bại và phải được log/theo dõi riêng.

### Giai đoạn 3 — Transactional Outbox khi cần bảo đảm giao nhận

- Chỉ triển khai khi email/thông báo được yêu cầu không được mất và cần retry bền vững.
- Khi nâng cấp, event và row outbox phải được ghi trong cùng transaction nghiệp vụ;
  worker chỉ đọc event đã commit, dispatch tới listener/channel, retry khi lỗi.
- Consumer phải idempotent theo `eventId` vì outbox có thể giao một event nhiều lần.
- Việc chuyển từ in-process sang outbox không được đổi event contract hoặc làm module
  nghiệp vụ phụ thuộc Notification.
- Chỉ emit cho sự kiện nghiệp vụ có ý nghĩa (duyệt, từ chối, trả, hỏng, sửa xong…),
  KHÔNG emit cho CRUD tầm thường.

## 8. Giao dịch (transaction)

- Thao tác chạm nhiều bảng phải nằm trong một Prisma transaction
  (`prisma.$transaction`), vd: duyệt đơn (đổi status đơn + đổi status nhiều asset +
  tạo borrow_histories).
- Dự án chốt dùng trực tiếp Prisma interactive transaction. Không tự xây Unit of Work
  hoặc transaction coordinator riêng ở giai đoạn hiện tại.
- Service điều phối mở `prisma.$transaction(async (tx) => { ... })` và truyền cùng
  `tx: Prisma.TransactionClient` xuống tất cả repository và service tham gia.
- Ví dụ duyệt đơn: `BorrowService` truyền cùng `tx` cho `BorrowRepository`,
  `BorrowHistoryRepository` và `AssetService.markBorrowed(assetIds, tx)`.
- `BorrowRepository` không được sửa bảng `assets`; `AssetService` vẫn là nơi giữ
  guard và gọi `AssetRepository` bằng `tx` nhận từ caller.
- Service con như `AssetService` không mở transaction mới khi caller đã truyền `tx`.
  Transaction lồng/độc lập không được coi là một giao dịch nguyên tử.
- Callback transaction trả về một hoặc nhiều pending events. Service chỉ gọi
  `eventBus.publish(event)` sau khi Promise `$transaction` resolve thành công.
- Không thực hiện HTTP call, gửi email, publish event hoặc công việc chậm không liên
  quan đến database bên trong callback vì transaction đang giữ connection/lock.
- Update state phải kiểm tra trạng thái kỳ vọng ngay trong câu lệnh update (conditional
  update). Nếu một asset đã bị request khác lấy trước, số bản ghi update bằng 0 → ném
  conflict và rollback toàn bộ transaction, tránh race condition “đọc available rồi ghi”.

## 9. Xử lý lỗi

- Dùng lớp lỗi domain thống nhất (vd `AppError` với `statusCode`, `code`, `message`).
- Có một error-handling middleware tập trung ở cuối chain; controller không tự
  `res.status(500)` rải rác.
- KHÔNG lộ stack trace / thông tin nội bộ ra response ở môi trường production.

## 10. Bảo mật (bắt buộc)

- KHÔNG có secret/JWT key trong source. Chỉ đọc từ biến môi trường (server-side).
- Password: hash bằng bcrypt (cột `password` VarChar(60) đã theo độ dài bcrypt).
- Refresh token: lưu dạng hash/định danh (`jti`), không lưu token thô có thể dùng lại.
- Validate mọi input ở tầng `validation` trước khi vào service.
- Coi mọi input bên ngoài là untrusted.

## 11. Test

- Mỗi acceptance criteria (REQ-xxx) trong spec phải có ít nhất một test tương ứng.
- Event-driven REQ → integration test với trigger cụ thể.
- State-driven / transition REQ → test chuyển trạng thái hợp lệ VÀ không hợp lệ.
- Unwanted-behavior REQ → test case lỗi/biên.

## 12. Quy tắc cho agent (Codex)

- Luôn đọc constitution + spec module liên quan TRƯỚC khi code.
- KHÔNG vượt scope đã định trong spec module.
- Nếu spec mơ hồ hoặc thiếu → DỪNG và hỏi, KHÔNG tự suy diễn.
- Bám sát cấu trúc, đặt tên, cách xử lý lỗi GIỐNG module mẫu đã hoàn thiện.
- Không sửa DB chéo module (xem mục 4).
- Sau khi sửa backend TypeScript, phải chạy `pnpm --filter backend typecheck`.
