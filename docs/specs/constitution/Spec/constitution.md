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
    bus.ts                       # 1 EventEmitter dùng chung toàn app
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
- `service` — chứa business logic, gọi repository và phát event. KHÔNG gọi Prisma trực tiếp.
- `repository contract` — định nghĩa dữ liệu vào/ra mà service cần, không import Prisma.
- `Prisma repository` — nơi duy nhất được gọi Prisma và mapping dữ liệu persistence.
- Service KHÔNG đọc `req`/`res`; repository KHÔNG quyết định HTTP status/response.
- Controller và service KHÔNG gọi Prisma trực tiếp.

## 4. Ranh giới module (QUAN TRỌNG NHẤT)

- Một module KHÔNG được `require` hay update trực tiếp bảng của module khác.
- Muốn tác động dữ liệu của module khác → gọi **service** của module đó.
- Service của một module chỉ phụ thuộc repository contract thuộc phạm vi module đó.
- Không import Prisma repository của module khác để đi vòng qua service.
- Cụ thể: chỉ module Thiết bị được đổi `assets.status`. Module Mượn/trả và Sửa chữa
  muốn đổi trạng thái asset thì gọi `assetService.markBorrowed()`,
  `assetService.markReturned()`, `assetService.markInRepair()`, `assetService.markAvailable()`.
  KHÔNG tự `prisma.assets.update({ status })` từ ngoài module Thiết bị.

## 5. Chuyển trạng thái (state transition)

- Hai enum có luật chuyển trạng thái: `assets.status`, `borrow_requests.status`.
- Mỗi chuyển trạng thái PHẢI đi qua một guard kiểm tra transition hợp lệ, đặt trong
  service chủ của bảng đó. Không rải logic "được chuyển từ X sang Y" khắp nơi.
- Nếu transition không hợp lệ → ném lỗi domain (vd `InvalidStateTransitionError`),
  KHÔNG âm thầm bỏ qua.
- Bảng transition hợp lệ xem `specs/00-overview.md`.

## 6. Xác thực & phân quyền

- MỌI resource route phải đi qua `requireAuth`, trừ các endpoint xác thực không thể
  yêu cầu access token như login và refresh. Logout có thể xác định phiên bằng
  refresh-token cookie nên không bắt buộc access token còn hạn.
- `requireAuth` verify access token và gắn payload đã validate vào `req.auth`.
- Route cần quyền phải gắn `requirePermission('permission_code')`.
- RBAC kiểm theo `permissions.code` (không hardcode theo role name).
- Không tự viết logic verify JWT rải rác — chỉ ở `auth.middleware`.
- Nếu không hỗ trợ tự đăng ký, tạo user chỉ đi qua `POST /api/users` và phải có
  `user.create`; Auth module chỉ giữ login, refresh và logout.

## 7. Sự kiện nghiệp vụ (event) — chuẩn bị cho Notification sau này

- Tại mỗi điểm chuyển trạng thái nghiệp vụ, service PHẢI `bus.emit(<event>, payload)`.
- Service nghiệp vụ CHỈ emit — tuyệt đối KHÔNG gọi/`require` module Notification.
- Emit CHỈ SAU KHI transaction commit thành công (không emit giữa transaction).
- Listener (module Notification, làm sau) tự bọc `try/catch`; lỗi thông báo KHÔNG
  được ảnh hưởng luồng nghiệp vụ chính.
- Chỉ emit cho sự kiện nghiệp vụ có ý nghĩa (duyệt, từ chối, trả, hỏng, sửa xong…),
  KHÔNG emit cho CRUD tầm thường.
- Danh sách event chuẩn xem `specs/00-overview.md`.

## 8. Giao dịch (transaction)

- Thao tác chạm nhiều bảng phải nằm trong một Prisma transaction
  (`prisma.$transaction`), vd: duyệt đơn (đổi status đơn + đổi status nhiều asset +
  tạo borrow_histories).
- Transaction được triển khai trong Prisma repository hoặc một persistence
  coordinator/Unit of Work; service vẫn không được gọi Prisma trực tiếp.
- Khi một use case cần gọi nhiều repository trong cùng transaction, các repository
  phải dùng chung transaction client được truyền qua abstraction phù hợp. Không mở
  các transaction độc lập rồi coi đó là một giao dịch nguyên tử.

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
