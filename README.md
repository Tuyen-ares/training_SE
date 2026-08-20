# BigIn Asset Management

BigIn Asset Management là hệ thống web nội bộ quản lý tài sản và thiết bị CNTT trong suốt vòng đời sử dụng: từ danh mục, cấp mã/QR, yêu cầu mượn, duyệt, bàn giao, hoàn trả đến xử lý sự cố và sửa chữa. Hệ thống phục vụ nhân viên, bộ phận vận hành tài sản/IT và quản trị viên trên cùng một workspace, với quyền truy cập được quyết định bằng permission thực tế của từng tài khoản.

README này phản ánh implementation hiện có trong repository. Nội dung dưới `docs/future/` chỉ là định hướng mở rộng và **không được xem là tính năng đã triển khai**.

## Cấu trúc repository

```text
training_SE/
├── apps/
│   ├── backend/
│   │   ├── prisma/              # Schema Prisma và lịch sử migration MariaDB/MySQL
│   │   ├── src/
│   │   │   ├── routes/          # Khai báo REST endpoints và auth/RBAC middleware
│   │   │   ├── controllers/     # Parse request, validation và tạo HTTP response
│   │   │   ├── services/        # Business rules, workflow và transaction boundaries
│   │   │   ├── repositories/    # Interface và Prisma persistence implementations
│   │   │   ├── middleware/      # JWT authentication và permission guards
│   │   │   ├── models/          # TypeScript domain/DTO types
│   │   │   ├── shared/          # Response, validation, media và utility dùng chung
│   │   │   ├── commands/        # Media audit/cleanup commands
│   │   │   ├── app.ts           # Cấu hình Express, CORS, health, Swagger và routes
│   │   │   └── server.ts        # Entry point mở HTTP server
│   │   ├── tests/               # Unit/service tests và DB integration tests
│   │   ├── openapi.yaml         # OpenAPI 3.0.3 — source của Swagger UI
│   │   └── .env.example         # Danh sách biến môi trường backend
│   └── frontend/
│       ├── src/
│       │   ├── views/            # Các màn hình theo domain nghiệp vụ
│       │   ├── components/       # UI components dùng chung và theo feature
│       │   ├── services/         # API client theo domain
│       │   ├── stores/           # Pinia stores, gồm auth/session state
│       │   ├── router/           # Vue Router và permission-aware route guards
│       │   ├── composables/      # Logic Vue tái sử dụng
│       │   ├── constants/        # Status/media constants
│       │   └── assets/           # CSS tokens, responsive styles và static assets
│       ├── public/               # Static files được Vite copy nguyên trạng
│       ├── scripts/              # Frontend static audit utilities
│       └── .env.example          # VITE_API_BASE_URL mẫu
├── docs/
│   ├── architecture/             # Kiến trúc, permission registry và technical rules
│   ├── contracts/                # API/domain contracts hiện hành
│   ├── delivery/frontend-spec/   # Navigation, screen inventory và user flows
│   ├── mvp-requirements/         # MVP scope, user stories và business rules
│   ├── modules/                  # Specification chi tiết theo module
│   ├── use-cases/                # Use case và workflow nghiệp vụ chi tiết
│   ├── plans/                    # Kế hoạch triển khai; phải đối chiếu code trước khi dùng
│   ├── project-context/          # Implementation memory có chọn lọc
│   ├── stitch-audit/             # Kết quả audit prototype/UI Stitch
│   ├── superpowers/              # Design specs và implementation plans lưu theo thời điểm
│   └── future/                   # FUTURE / NOT IMPLEMENTED
├── design/                       # Design system và system-design notes
├── training/                     # Code minh họa/học tập, không thuộc production app
├── tooling/                      # Repository-specific Codex/plugin tooling
├── database.md                   # Tài liệu mô hình database
├── package.json                  # Root commands chạy workspace
├── pnpm-lock.yaml                # Khóa chính xác dependency versions
└── pnpm-workspace.yaml           # Khai báo workspace packages trong apps/*
```

Hai phần chạy production là `apps/backend` và `apps/frontend`. Frontend production chỉ import code trong `apps/frontend/src`; thư mục `training/` không tham gia runtime.

## Mục lục

- [Cấu trúc repository](#cấu-trúc-repository)
- [Chức năng đã triển khai](#chức-năng-đã-triển-khai)
- [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Database và dữ liệu khởi tạo](#database-và-dữ-liệu-khởi-tạo)
- [Biến môi trường](#biến-môi-trường)
- [Các lệnh thường dùng](#các-lệnh-thường-dùng)
- [Testing và verification](#testing-và-verification)
- [Build và deploy](#build-và-deploy)
- [Tài liệu liên quan](#api-và-tài-liệu-liên-quan)
- [Giới hạn hiện tại](#giới-hạn-hiện-tại)
- [Checklist bàn giao](#checklist-bàn-giao)

## Chức năng đã triển khai

Authorization sử dụng **flat RBAC** theo effective permissions, không hard-code hành vi theo tên role. Một tài khoản có thể có nhiều role và nhận hợp của toàn bộ permission được gán. Các role hệ thống thường dùng là `employee`, `asset_manager` và `admin`; repository cũng hỗ trợ tạo custom role.

| Nhóm nghiệp vụ | Khả năng hiện có |
| --- | --- |
| Authentication & profile | Đăng nhập, access token JWT, refresh-token rotation qua cookie `HttpOnly`, khôi phục phiên, đăng xuất, cập nhật hồ sơ/avatar và đổi mật khẩu. |
| Registration & access review | Khách gửi yêu cầu đăng ký; người có quyền review có thể duyệt/từ chối, chọn phòng ban và role ban đầu. |
| Asset management | Danh sách/chi tiết/tạo/cập nhật tài sản; quản lý brand, asset type và model; cấp asset code; retire tài sản; ảnh đại diện tài sản. |
| QR workflow | QR bất biến cho từng tài sản, in/hiển thị QR, quét bằng camera và tra cứu tài sản theo QR code. QR dùng để identify/lookup, không phải stocktake. |
| Borrow lifecycle | Tạo phiếu mượn nhiều tài sản, xem/thu hồi phiếu của mình, duyệt hoặc từ chối từng dòng, approve-all, giữ chỗ, bàn giao, hoàn trả và xem lịch sử. |
| Asset issues & repair | Báo hỏng, xác nhận/từ chối sự cố, bắt đầu/cập nhật/hoàn tất/thất bại sửa chữa, chọn vendor và xử lý damaged return trong cùng workflow. |
| Notifications | Notification center trong ứng dụng, unread count, đánh dấu đã đọc và điều hướng đến đối tượng liên quan khi còn quyền truy cập. |
| Administration | Quản lý user, trạng thái active, department, role, permission assignment và user-role assignment theo permission. |
| Media evidence | Ảnh bàn giao, ảnh hoàn trả, ảnh sau sửa chữa, asset image và user avatar qua presigned PUT lên private S3; đọc qua CloudFront. |

Một số quy tắc nghiệp vụ quan trọng:

- Approval chỉ giữ chỗ; tài sản chuyển sang `BORROWED` khi bàn giao thực tế.
- Approval Queue tách khỏi Handover/Return Queue và sử dụng permission riêng.
- Report Issue chưa tự chuyển tài sản sang `DAMAGED`; Confirm Issue mới thực hiện chuyển trạng thái.
- Normal Return, Damaged Return và các mutation nhiều bảng được xử lý trong một Prisma transaction do service điều phối.
- `department_id` biểu diễn ownership theo tổ chức, không phải vị trí vật lý.

## Kiến trúc tổng quan

### Luồng xử lý nghiệp vụ chính

```text
┌──────────────────────────────┐
│ Người dùng trên trình duyệt  │
└──────────────┬───────────────┘
               │ mở ứng dụng / thao tác
               ▼
┌──────────────────────────────┐
│ Frontend: Vue 3 + Vite       │
│ - Hiển thị giao diện         │
│ - Giữ access token trong RAM │
│ - Kiểm tra permission ở UI   │
└──────────────┬───────────────┘
               │
               │ REST /api
               │ Request: JSON + JWT
               │ Response: JSON
               ▼
┌──────────────────────────────────────────────┐
│ Backend: Express 5 + TypeScript              │
│                                              │
│ Route/Middleware                             │
│        ↓ xác thực JWT và kiểm tra permission │
│ Controller                                   │
│        ↓ validate request / tạo response     │
│ Service                                      │
│        ↓ business rules / transaction        │
│ Repository                                   │
│        ↓ Prisma query                        │
└──────────────┬───────────────────────────────┘
               │
               │ đọc/ghi dữ liệu
               ▼
┌──────────────────────────────┐
│ MariaDB / MySQL              │
│ - Dữ liệu nghiệp vụ          │
│ - RBAC và refresh-token data │
│ - Prisma migrations          │
└──────────────────────────────┘
```

Request và response đi hai chiều giữa frontend và backend; mũi tên đi xuống chỉ thể hiện thứ tự xử lý của một request. Backend hiện là một **layered modular monolith**, không phải microservices.

### Luồng upload và đọc media

```text
(1) Xin URL upload
    Frontend ───────── POST /api/media/presign ─────────► Backend

(2) Upload file trực tiếp, không đi qua backend
    Frontend ───────────── presigned PUT ───────────────► Private S3

(3) Báo upload hoàn tất và kiểm tra object
    Frontend ───── POST /api/media/{id}/complete ──────► Backend
    Backend  ─────────────── HeadObject ───────────────► Private S3

(4) Đọc ảnh đã sẵn sàng
    Frontend ───────────── public media URL ────────────► CloudFront
    CloudFront ─────────────── OAC ────────────────────► Private S3
```

MariaDB/MySQL chỉ lưu metadata và quan hệ của media; binary file nằm trong S3. CloudFront chỉ phục vụ luồng đọc media, không đứng giữa frontend và REST API.

Luồng xử lý bên trong backend:

```text
Route → Middleware → Controller → Service → Repository → Prisma → MariaDB/MySQL
```

Các điểm kiến trúc chính:

- Route khai báo endpoint và auth/RBAC guard; Controller xử lý HTTP/validation; Service sở hữu business rules và transaction; Repository đóng gói persistence.
- Các repository có interface và Prisma implementation; Service không chứa HTTP concerns.
- Multi-write use case sử dụng một transaction owner và truyền cùng transaction client cho các participant.
- Access token chứa effective permission codes; metadata refresh token (`jti`/family) được lưu để rotate và revoke theo token family.
- Media upload dùng direct-to-S3 presigned PUT. Backend chỉ đánh dấu `READY` sau khi kiểm tra metadata bằng `HeadObject`, rồi business service mới liên kết media trong transaction.
- Asset code allocation và các workflow nhạy cảm có database locking/concurrency guard; conflict nghiệp vụ trả về HTTP `409` theo API contract.

## Tech stack

| Thành phần | Công nghệ |
| --- | --- |
| Monorepo | pnpm workspace (`pnpm@10.32.1`) |
| Frontend | Vue 3, Vite 8, Vue Router, Pinia, Ant Design Vue, Axios |
| Backend | Node.js, Express 5, TypeScript, Zod |
| Authentication | JWT HS256, refresh token rotation, bcrypt, flat RBAC |
| Database | MariaDB/MySQL, Prisma 7, `@prisma/adapter-mariadb` |
| Media | AWS S3, CloudFront + OAC, presigned PUT |
| API documentation | OpenAPI 3.0.3, Swagger UI |
| Testing | Node test runner qua `tsx`; unit/service tests và DB integration tests |

## Quick start

### 1. Yêu cầu hệ thống

- Git.
- Node.js `^20.19.0` hoặc `>=22.12.0`.
- Corepack và pnpm `10.32.1`.
- Một MariaDB/MySQL database có thể truy cập từ máy chạy backend.
- AWS S3/CloudFront chỉ bắt buộc khi cần dùng media; production backend yêu cầu media configuration hợp lệ ngay khi khởi động.

Repository hiện **không có Docker Compose**, vì vậy database cần được chạy/cấp riêng.

### 2. Clone và cài dependencies

```bash
git clone https://github.com/Tuyen-ares/training_SE.git
cd training_SE
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm install
```

### 3. Tạo file môi trường

PowerShell:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env
```

Bash:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Điền cấu hình database và JWT trong `apps/backend/.env`. Không commit `.env` hoặc secret vào Git.

Ví dụ tối thiểu cho local development:

```dotenv
# apps/backend/.env
DB_HOST=localhost
DB_PORT=3306
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_NAME=<database-name>

FRONTEND_ORIGIN=http://localhost:5173
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<another-long-random-secret>
REFRESH_TOKEN_EXPIRES_IN=7d
DEFAULT_REGISTER_ROLE_NAME=employee
```

```dotenv
# apps/frontend/.env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 4. Khởi tạo Prisma client và database schema

Trước tiên, tạo một database rỗng trên MariaDB/MySQL và bảo đảm tên database khớp `DB_NAME`. Sau đó chạy từ thư mục gốc:

```bash
pnpm --filter backend exec prisma generate
pnpm --filter backend exec prisma migrate deploy
```

`migrate deploy` áp dụng toàn bộ migration đã commit. Xem thêm lưu ý về bootstrap data ở phần [Database và dữ liệu khởi tạo](#database-và-dữ-liệu-khởi-tạo).

### 5. Chạy frontend và backend

Cách đơn giản nhất — chạy cả hai ứng dụng trong một terminal:

```bash
pnpm dev
```

| Dịch vụ | URL mặc định |
| --- | --- |
| Web app | <http://localhost:5173> |
| API base | <http://localhost:3000/api> |
| Health check | <http://localhost:3000/health> |
| Swagger UI | <http://localhost:3000/swagger> |

Kiểm tra backend đã chạy:

```bash
curl http://localhost:3000/health
```

Response mong đợi:

```json
{"status":"ok"}
```

Nếu muốn tách log frontend/backend, mở hai terminal tại thư mục gốc:

```bash
# Terminal 1
pnpm dev:backend

# Terminal 2
pnpm dev:frontend
```

> **Lưu ý:** migrate một database trắng không tự tạo default account. Muốn đăng nhập và chạy đầy đủ workflow, cần restore baseline database được bàn giao hoặc provision department, role/permission mappings và active admin/reviewer account như mô tả ở phần database.

## Database và dữ liệu khởi tạo

- Prisma schema: [`apps/backend/prisma/schema.prisma`](apps/backend/prisma/schema.prisma).
- Migration history: [`apps/backend/prisma/migrations/`](apps/backend/prisma/migrations/).
- Prisma CLI config: [`apps/backend/prisma.config.ts`](apps/backend/prisma.config.ts).
- Tài liệu mô hình dữ liệu: [`database.md`](database.md).

Datasource dùng Prisma provider `mysql` và MariaDB adapter, phù hợp với MariaDB/MySQL. `prisma.config.ts` ưu tiên dựng connection URL từ `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; `DATABASE_URL` chỉ là fallback cho Prisma CLI khi bộ `DB_*` không đầy đủ. Runtime API vẫn kết nối bằng các biến `DB_*`, nên cách an toàn là luôn cấu hình đủ bộ này.

Repository hiện **không có seed/bootstrap script và không cung cấp default account/password**. Migrations tạo/cập nhật schema và một phần reference permissions, nhưng một database hoàn toàn mới vẫn cần baseline data phù hợp để vận hành, tối thiểu gồm department, role/permission mappings và một active account có quyền quản trị/review.

Khi bàn giao môi trường, nên chọn một trong hai cách:

1. Restore database dump đã được duyệt và truyền credential qua kênh bảo mật; hoặc
2. Provision baseline data bằng quy trình nội bộ có kiểm soát, lưu mật khẩu dưới dạng bcrypt hash và đổi mật khẩu ngay lần đăng nhập đầu.

Không chạy DB integration tests trên production database.

## Biến môi trường

Source of truth là [`apps/backend/.env.example`](apps/backend/.env.example), [`apps/frontend/.env.example`](apps/frontend/.env.example) và code đọc `process.env`.

### Backend

| Nhóm | Biến | Ghi chú |
| --- | --- | --- |
| Runtime | `PORT` | Port API, mặc định `3000`. |
| Runtime | `NODE_ENV` | Ở `production`, refresh cookie dùng `Secure`/`SameSite=None` và backend bắt buộc media config hợp lệ. |
| Database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Kết nối MariaDB/MySQL; port mặc định trong code là `3306`. |
| CORS | `FRONTEND_ORIGIN` | Một hoặc nhiều origin, phân tách bằng dấu phẩy. Production phải dùng origin chính xác, không có path hoặc dấu `/` cuối. |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN` | Bắt buộc để phát access token. Example dùng `15m`. |
| Refresh token | `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN` | Secret bắt buộc; thời hạn mặc định trong code là `7d`. |
| Registration | `DEFAULT_REGISTER_ROLE_NAME` | Role fallback khi approve registration/create user mà không chọn role; example là `employee`. Role tương ứng phải tồn tại trong DB. |
| AWS | `AWS_REGION`, `AWS_S3_BUCKET_NAME` | Region và private bucket dùng cho media. |
| AWS auth | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Phải cấu hình đủ cặp nếu dùng static credentials; có thể bỏ trống khi runtime có IAM role phù hợp. |
| CDN | `PUBLIC_MEDIA_BASE_URL` | CloudFront base URL tuyệt đối, không có dấu `/` cuối. |
| Media policy | `MEDIA_ALLOWED_MIME_TYPES` | MIME types cho phép; mặc định `image/jpeg,image/png,image/webp`. |
| Media policy | `MEDIA_MAX_IMAGE_SIZE_BYTES` | Dung lượng tối đa mỗi ảnh; example là `10485760` bytes. |
| Media policy | `MEDIA_MAX_EVIDENCE_IMAGE_COUNT` | Số ảnh evidence tối đa; example là `10`. |
| Media policy | `MEDIA_PRESIGNED_PUT_EXPIRES_SECONDS` | Thời hạn presigned PUT; example là `300`, code giới hạn tối đa `900` giây. |

### Frontend

| Biến | Ghi chú |
| --- | --- |
| `VITE_API_BASE_URL` | API base URL được nhúng tại build time; local mặc định/fallback là `http://localhost:3000/api`. |

Sau khi đổi biến `VITE_*`, phải build lại frontend.

## Các lệnh thường dùng

Chạy từ thư mục gốc repository:

| Lệnh | Mục đích |
| --- | --- |
| `pnpm dev` | Chạy backend và frontend song song. |
| `pnpm dev:backend` | Chạy Express API bằng `tsx watch`. |
| `pnpm dev:frontend` | Chạy Vite dev server. |
| `pnpm --filter backend exec prisma generate` | Generate Prisma client vào `apps/backend/generated/prisma`. |
| `pnpm --filter backend exec prisma migrate deploy` | Áp dụng migrations đã commit. |
| `pnpm --filter backend typecheck` | Type-check backend, không emit. |
| `pnpm --filter backend build` | Build backend vào `apps/backend/dist`. |
| `pnpm build:frontend` | Build frontend vào `apps/frontend/dist`. |
| `pnpm start:backend` | Chạy backend đã build. |
| `pnpm --filter frontend preview` | Preview frontend production build. |
| `pnpm --filter backend media:audit` | Audit record/object media theo môi trường đang cấu hình. |
| `pnpm --filter backend media:cleanup` | Cleanup media stale/orphan theo command hiện có; đây là thao tác có thay đổi dữ liệu, cần kiểm tra đúng environment trước khi chạy. |

Khi phát triển thay đổi schema mới, dùng Prisma migration có tên rõ ràng và review SQL sinh ra trước khi commit:

```bash
pnpm --filter backend exec prisma migrate dev --name <migration_name>
```

## Testing và verification

Tất cả lệnh dưới đây chạy từ thư mục gốc repository.

### 1. Unit/service tests của backend

Nhóm này dùng fake/mock repository và không cần kết nối database thật:

```bash
pnpm --filter backend test
```

### 2. DB integration tests của backend

Trước khi chạy:

1. Tạo một MariaDB/MySQL database **riêng cho test**.
2. Trỏ bộ `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` trong `apps/backend/.env` vào database test.
3. Generate Prisma client và chạy migrations.
4. Bảo đảm database có baseline department, role và account/reference data mà integration suite yêu cầu.

```bash
pnpm --filter backend exec prisma generate
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend test:db
```

Integration suite tạo và xóa test records. Không chạy lệnh này trên staging, production hoặc database chứa bản dữ liệu bàn giao duy nhất.

### 3. Type-check backend

```bash
pnpm --filter backend typecheck
```

Nếu Prisma client chưa được generate:

```bash
pnpm --filter backend exec prisma generate
pnpm --filter backend typecheck
```

### 4. Build verification

```bash
pnpm --filter backend exec prisma generate
pnpm --filter backend build
pnpm build:frontend
```

Frontend chưa có automated test script, vì vậy `pnpm build:frontend` là automated verification hiện có cho frontend. Repository cũng chưa khai báo lint script ở root/backend/frontend.

### 5. Bộ lệnh khuyến nghị trước khi bàn giao

```bash
pnpm --filter backend exec prisma generate
pnpm --filter backend test
pnpm --filter backend typecheck
pnpm --filter backend build
pnpm build:frontend
```

Chỉ thêm `pnpm --filter backend test:db` khi đã cấu hình đúng database test riêng và baseline data.

## Media flow

Luồng media hiện đã được triển khai:

1. Frontend gọi `POST /api/media/presign` với purpose, MIME type và kích thước.
2. Backend tạo storage key bất biến, lưu record `PENDING` và trả presigned PUT URL.
3. Browser upload trực tiếp lên private S3 rồi gọi `POST /api/media/{mediaId}/complete`.
4. Backend dùng `HeadObject` kiểm tra content length, content type và cache control trước khi chuyển record sang `READY`.
5. Business mutation liên kết media với asset, user hoặc evidence table trong transaction.
6. Client đọc ảnh qua `PUBLIC_MEDIA_BASE_URL + storage_path`; CloudFront truy cập private S3 bằng OAC.

AWS credentials chỉ nằm ở backend. Frontend không nhận credential hoặc presigned GET URL. Việc smoke test S3/CloudFront cần hạ tầng AWS thật với bucket policy, CORS và OAC đúng cấu hình.

## Build và deploy

### Backend

```bash
pnpm install --frozen-lockfile
pnpm --filter backend exec prisma generate
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend build
pnpm start:backend
```

Backend bind vào `process.env.PORT`. Health probe dùng `GET /health`. Khi frontend và backend khác origin, production phải chạy HTTPS để refresh cookie `Secure`/`SameSite=None` hoạt động.

### Frontend

```bash
pnpm install --frozen-lockfile
pnpm build:frontend
```

Artifact nằm tại `apps/frontend/dist`. Static host phải có SPA fallback về `index.html` để refresh các deep link như `/assets/:id` hoặc `/qr/:qrCode` không trả 404.

Repository chưa có workflow CI/CD hoặc infrastructure-as-code. Hướng dẫn deploy thủ công tham khảo [`docs/deployment-guide.md`](docs/deployment-guide.md); khi có khác biệt, ưu tiên package scripts, `.env.example` và code hiện tại.

## API và tài liệu liên quan

- OpenAPI source: [`apps/backend/openapi.yaml`](apps/backend/openapi.yaml).
- API catalog: [`docs/contracts/api-catalog.md`](docs/contracts/api-catalog.md).
- MVP scope và business rules: [`docs/mvp-requirements/README.md`](docs/mvp-requirements/README.md).
- System overview: [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md).
- Permission registry: [`docs/architecture/permission-registry.md`](docs/architecture/permission-registry.md).
- Frontend specification: [`docs/delivery/frontend-spec/README.md`](docs/delivery/frontend-spec/README.md).
- Implementation memory: [`docs/project-context/implementation-memory.md`](docs/project-context/implementation-memory.md).
- Delivery audit snapshot: [`docs/delivery-status.md`](docs/delivery-status.md).
- Deployment guide: [`docs/deployment-guide.md`](docs/deployment-guide.md).

Thứ tự ưu tiên khi tài liệu có khác biệt: **registered route/controller/service và Prisma schema/migrations → OpenAPI/contracts hiện hành → MVP requirements → project context/audit snapshot**. `docs/future/**` không phải current requirements.

## Giới hạn hiện tại

- Không có seed/bootstrap command hoặc default credential trong repository.
- Không có Dockerfile/Docker Compose để dựng toàn stack local.
- Không có GitHub Actions hay pipeline deploy tự động trong repository hiện tại.
- Frontend chưa có automated test/lint script; backend có unit và DB integration tests nhưng integration suite phụ thuộc baseline database data.
- Media flow phụ thuộc AWS S3/CloudFront thực tế; repository không provision bucket, OAC, DNS hoặc IAM.
- Inventory/stocktake, accessory checklist và electronic acknowledgement không nằm trong MVP schema hiện tại.
- Tài liệu trong `docs/future/` có thể mô tả intended design chưa được triển khai.

## Checklist bàn giao

Trước khi chuyển quyền vận hành cho team mới:

- [ ] Bàn giao database dump/baseline data và credential qua kênh bảo mật, không commit vào Git.
- [ ] Xác nhận active admin/reviewer account, department, role và permission mappings.
- [ ] Bàn giao production environment variables và quy trình rotate JWT/AWS secrets.
- [ ] Xác nhận S3 bucket, CloudFront distribution/OAC, IAM policy và bucket CORS nếu dùng media.
- [ ] Cập nhật `FRONTEND_ORIGIN` và `VITE_API_BASE_URL` theo domain thực tế rồi rebuild frontend.
- [ ] Chạy Prisma generate/migrate, backend type-check/build và frontend build trên commit bàn giao.
- [ ] Kiểm tra `/health`, `/swagger`, login/refresh/logout và ít nhất một happy path của asset, borrow/return, issue/repair và media upload.
- [ ] Ghi nhận rõ phần nào là current implementation và phần nào chỉ nằm trong `docs/future/`.
