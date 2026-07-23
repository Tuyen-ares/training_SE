# Đề xuất cấu trúc Backend theo Feature

> Trạng thái: bản thiết kế để xem xét, **chưa di chuyển source code**.
>
> Stack giữ nguyên: Express 5, TypeScript, Prisma, MySQL/MariaDB và Zod.
>
> Constitution hiện tại vẫn mô tả cấu trúc theo layer toàn cục. Vì vậy đây là
> **cấu trúc đích được đề xuất**; chỉ refactor source sau khi đề xuất được duyệt
> và constitution đã được cập nhật.

## 1. Mục tiêu

Cấu trúc hiện tại đang chia file theo layer toàn cục:

```text
controllers/
services/
repositories/
models/
routes/
```

Muốn đọc trọn luồng Auth hoặc Asset phải mở nhiều thư mục khác nhau.

Cấu trúc feature-first sẽ gom các file cùng nghiệp vụ vào một module:

```text
modules/auth/
modules/users/
modules/rbac/
modules/assets/
modules/borrow/
modules/repair/
```

Bên trong từng module vẫn giữ luồng:

```text
route → controller → service → repository → Prisma
```

Đây là **feature-first kết hợp n-layer**, không phải NestJS và không cần thêm
framework hoặc DI container.

## 2. Cấu trúc đề xuất đầy đủ

```text
apps/backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── generated/
│   └── prisma/                         # Prisma sinh tự động, không sửa tay
│
└── src/
    ├── app.ts                          # Cấu hình Express và middleware toàn app
    ├── server.ts                       # Khởi động HTTP server
    ├── prisma.ts                       # PrismaClient singleton
    │
    ├── modules/
    │   ├── index.ts                    # Đăng ký route do các module export
    │   │
    │   ├── auth/
    │   │   ├── auth.model.ts
    │   │   ├── auth.dto.ts
    │   │   ├── auth.repository.ts
    │   │   ├── auth.prisma.repository.ts
    │   │   ├── refresh-token.repository.ts
    │   │   ├── refresh-token.prisma.repository.ts
    │   │   ├── auth.service.ts
    │   │   ├── token.service.ts
    │   │   ├── auth.controller.ts
    │   │   ├── auth.middleware.ts      # Verify access token
    │   │   ├── auth.routes.ts
    │   │   └── index.ts                # Public API của Auth module
    │   │
    │   ├── rbac/
    │   │   ├── rbac.model.ts
    │   │   ├── role-assignment.dto.ts
    │   │   ├── rbac.repository.ts
    │   │   ├── rbac.prisma.repository.ts
    │   │   ├── rbac.service.ts
    │   │   ├── rbac.controller.ts
    │   │   ├── rbac.middleware.ts      # requirePermission()
    │   │   ├── rbac.routes.ts
    │   │   └── index.ts
    │   │
    │   ├── users/
    │   │   ├── user.model.ts
    │   │   ├── user.dto.ts
    │   │   ├── user.repository.ts
    │   │   ├── user.prisma.repository.ts
    │   │   ├── user.service.ts
    │   │   ├── user.controller.ts
    │   │   ├── user.routes.ts
    │   │   │
    │   │   ├── departments/
    │   │   │   ├── department.model.ts
    │   │   │   ├── department.dto.ts
    │   │   │   ├── department.repository.ts
    │   │   │   ├── department.prisma.repository.ts
    │   │   │   ├── department.service.ts
    │   │   │   ├── department.controller.ts
    │   │   │   └── department.routes.ts
    │   │   │
    │   │   └── index.ts
    │   │
    │   ├── assets/
    │   │   ├── asset.model.ts
    │   │   ├── asset.dto.ts
    │   │   ├── asset.repository.ts
    │   │   ├── asset.prisma.repository.ts
    │   │   ├── asset.service.ts
    │   │   ├── asset.controller.ts
    │   │   ├── asset.routes.ts
    │   │   │
    │   │   ├── catalogs/
    │   │   │   ├── brands/
    │   │   │   │   ├── brand.model.ts
    │   │   │   │   ├── brand.repository.ts
    │   │   │   │   ├── brand.prisma.repository.ts
    │   │   │   │   ├── brand.service.ts
    │   │   │   │   ├── brand.controller.ts
    │   │   │   │   └── brand.routes.ts
    │   │   │   │
    │   │   │   ├── asset-types/
    │   │   │   │   ├── asset-type.model.ts
    │   │   │   │   ├── asset-type.repository.ts
    │   │   │   │   ├── asset-type.prisma.repository.ts
    │   │   │   │   ├── asset-type.service.ts
    │   │   │   │   ├── asset-type.controller.ts
    │   │   │   │   └── asset-type.routes.ts
    │   │   │   │
    │   │   │   └── asset-models/
    │   │   │       ├── asset-model.model.ts
    │   │   │       ├── asset-model.repository.ts
    │   │   │       ├── asset-model.prisma.repository.ts
    │   │   │       ├── asset-model.service.ts
    │   │   │       ├── asset-model.controller.ts
    │   │   │       └── asset-model.routes.ts
    │   │   │
    │   │   └── index.ts
    │   │
    │   ├── borrow/
    │   │   ├── borrow-request.model.ts
    │   │   ├── borrow-request.dto.ts
    │   │   ├── borrow.repository.ts
    │   │   ├── borrow.prisma.repository.ts
    │   │   ├── borrow-history.repository.ts
    │   │   ├── borrow-history.prisma.repository.ts
    │   │   ├── borrow.service.ts
    │   │   ├── borrow.controller.ts
    │   │   ├── borrow.routes.ts
    │   │   └── index.ts
    │   │
    │   └── repair/
    │       ├── repair-log.model.ts
    │       ├── repair-log.dto.ts
    │       ├── repair.repository.ts
    │       ├── repair.prisma.repository.ts
    │       ├── repair.service.ts
    │       ├── repair.controller.ts
    │       ├── repair.routes.ts
    │       └── index.ts
    │
    ├── shared/
    │   ├── api-response.ts
    │   ├── app-error.ts
    │   ├── base.controller.ts
    │   ├── base.repository.ts
    │   ├── base.service.ts
    │   ├── request-validation.ts
    │   └── rest-router.ts
    │
    ├── events/                          # Target, chưa triển khai
    │   ├── bus.ts
    │   └── domain-event.ts
    │
    └── types/
        └── express.d.ts
```

## 3. Vì sao chọn `modules/` thay vì `features/`?

Hai tên đều dùng được. Dự án này nên dùng `modules/` vì tài liệu hiện đã định nghĩa:

- Auth module
- Users module
- RBAC module
- Asset module
- Borrow module
- Repair module

Như vậy tên thư mục khớp trực tiếp với:

- `docs/modules/*.md`
- `docs/architecture/module-boundaries.md`
- ownership của bảng trong database

Trong dự án này, một module chính là một feature nghiệp vụ đủ lớn và có ranh giới
dữ liệu riêng.

## 4. Trách nhiệm bên trong một module

Ví dụ Asset:

```text
asset.routes.ts
    ↓
asset.controller.ts
    ↓
asset.service.ts
    ↓
asset.repository.ts
    ↑
asset.prisma.repository.ts
    ↓
Prisma
```

| File | Trách nhiệm |
|---|---|
| `*.routes.ts` | URL, HTTP method, middleware, manual DI |
| `*.controller.ts` | Validate HTTP input, gọi service, trả `ApiResponse` |
| `*.service.ts` | Quy tắc nghiệp vụ và điều phối transaction |
| `*.repository.ts` | Interface/hợp đồng persistence mà service cần |
| `*.prisma.repository.ts` | Prisma query và mapping dữ liệu |
| `*.model.ts` | Application model, enum và kiểu nghiệp vụ |
| `*.dto.ts` | Dữ liệu HTTP đi vào hoặc trả ra client |
| `index.ts` | Chỉ export public API mà module khác được phép sử dụng |

## 5. Quy tắc public boundary

Module khác không import file nội bộ tùy ý.

Không nên:

```ts
import { PrismaAssetRepository }
  from '@/modules/assets/asset.prisma.repository.js';
```

Nên:

```ts
import type { AssetStatusService }
  from '@/modules/assets/index.js';
```

`index.ts` của Asset chỉ export những gì module khác thật sự cần:

```ts
export type { AssetStatusService } from './asset.service.js';
export type {
  ReturnCondition,
  RepairResult,
} from './asset.model.js';
```

Không export Prisma repository ra ngoài module. Nhờ vậy Borrow không thể đi vòng
qua AssetService để tự sửa `assets.status`.

## 6. Dependency giữa các module

```text
Auth ─────────→ Users
  └───────────→ RBAC

Users ────────→ RBAC
  └───────────→ Auth session revocation

Borrow ───────→ Users
  └───────────→ Assets

Repair ───────→ Users
  └───────────→ Assets
```

Các dependency này chỉ đi qua service/application port được module chủ export.

Ví dụ:

- Borrow gọi `AssetService.reserve()`; không gọi `prisma.assets`.
- Users gọi `RbacService.assignRoles()`; không gọi `prisma.user_roles`.
- Users gọi Auth session service để revoke phiên; không gọi
  `refreshTokenRepository` trực tiếp.

`shared/` không được import ngược lại bất kỳ module nghiệp vụ nào.

Sơ đồ trên mô tả dependency ở mức use case, không có nghĩa các concrete service
được import trực tiếp lẫn nhau. Riêng quan hệ hai chiều giữa Auth và Users:

- Auth nhận một contract nhỏ để đọc tài khoản phục vụ đăng nhập.
- Users nhận một contract nhỏ để thu hồi session khi vô hiệu hóa tài khoản.
- `app.ts` hoặc composition root khởi tạo implementation và truyền dependency vào.
- `auth.service.ts` và `user.service.ts` không import trực tiếp lẫn nhau, tránh
  circular dependency.

## 7. Vì sao Department nằm trong Users?

Department là danh mục thuộc ranh giới Users:

- `users.department_id` tham chiếu `departments`.
- Users kiểm tra Department khi tạo/cập nhật tài khoản.
- Không có luồng nghiệp vụ độc lập lớn ngoài quản trị người dùng.

Do đó:

```text
modules/users/departments/
```

hợp lý hơn một top-level module riêng.

Tương tự, Brand, Asset Type và Asset Model là catalog của Asset:

```text
modules/assets/catalogs/
```

Chúng vẫn có route/controller/service/repository riêng nhưng cùng ownership với
Asset module.

## 8. Có cần thêm `domain/`, `application/`, `infrastructure/` trong mỗi module không?

Chưa cần.

Cấu trúc sau sẽ quá sâu với quy mô hiện tại:

```text
modules/assets/
  domain/
  application/
  infrastructure/
  presentation/
```

Nó phù hợp khi mỗi module đã rất lớn. Hiện tại giữ các file phẳng trong module sẽ:

- Dễ học hơn.
- Ít import path dài.
- Ít boilerplate.
- Vẫn giữ đúng route → controller → service → repository.

Chỉ tạo thư mục con khi module có nhóm tài nguyên rõ ràng, như:

- `users/departments`
- `assets/catalogs`

## 9. Mapping từ cấu trúc hiện tại

| Hiện tại | Sau khi đổi |
|---|---|
| `controllers/auth.controller.ts` | `modules/auth/auth.controller.ts` |
| `services/auth.service.ts` | `modules/auth/auth.service.ts` |
| `services/token.service.ts` | `modules/auth/token.service.ts` |
| `repositories/auth.repository.ts` | `modules/auth/auth.repository.ts` |
| `repositories/refresh-token.repository.ts` | `modules/auth/refresh-token.repository.ts` |
| `middleware/auth.middleware.ts` | `modules/auth/auth.middleware.ts` |
| Phần `requirePermission()` trong auth middleware | `modules/rbac/rbac.middleware.ts` |
| `models/user.model.ts` | `modules/users/user.model.ts` |
| `controllers/department.controller.ts` | `modules/users/departments/department.controller.ts` |
| `services/assets.service.ts` | `modules/assets/asset.service.ts` |
| `controllers/brand.controller.ts` | `modules/assets/catalogs/brands/brand.controller.ts` |
| `routes/index.ts` | `modules/index.ts` |

`shared/`, `types/`, `app.ts`, `server.ts`, `prisma.ts`, Prisma schema và migrations
chưa cần thay đổi vị trí ở lần refactor đầu tiên.

## 10. Cách manual DI hoạt động sau khi đổi

Mỗi module vẫn tự lắp dependency trong route hoặc module factory:

```ts
const repository = new PrismaAssetRepository(prisma);
const service = new AssetService(repository);
const controller = new AssetController(service);

export const assetRoutes = createAssetRoutes(controller);
```

Root chỉ đăng ký route:

```ts
const routes = [
  ...authModuleRoutes,
  ...userModuleRoutes,
  ...rbacModuleRoutes,
  ...assetModuleRoutes,
  ...borrowModuleRoutes,
  ...repairModuleRoutes,
];
```

Chưa cần DI container. Khi dependency liên module nhiều hơn, có thể thêm
`src/main/container.ts`, nhưng đó là bước sau, không phải yêu cầu của feature-first.

## 11. Thứ tự refactor an toàn

Không di chuyển tất cả file trong một lần.

### Bước 1 — cập nhật luật kiến trúc

- Chốt tài liệu này.
- Sửa mục cấu trúc thư mục trong `constitution.md` từ layer-first sang feature-first.
- Không thay đổi API hoặc nghiệp vụ.

### Bước 2 — dùng Asset làm module mẫu

Asset ít phụ thuộc module khác và vừa được hoàn thiện:

1. Tạo `src/modules/assets/`.
2. Di chuyển Asset inventory.
3. Di chuyển Brand, Asset Type, Asset Model vào `assets/catalogs/`.
4. Cập nhật import.
5. Chạy typecheck và build.

### Bước 3 — Users và Departments

1. Tạo `src/modules/users/`.
2. Di chuyển User.
3. Di chuyển Department vào `users/departments/`.
4. Chưa thêm `is_active` hoặc role assignment trong cùng commit refactor.

### Bước 4 — Auth

- Di chuyển Auth, TokenService và Refresh Token.
- Chưa thay đổi rotation trong commit di chuyển.

### Bước 5 — RBAC

- Tách `requirePermission()` khỏi Auth middleware.
- Tạo public service cho role assignment.
- Không CRUD role/permission trong giai đoạn hiện tại.

### Bước 6 — Borrow và Repair

- Chỉ tạo module khi bắt đầu implement nghiệp vụ tương ứng.
- Dùng public API của Asset và Users; không import repository chéo module.

Sau mỗi bước:

```text
pnpm --filter backend typecheck
pnpm --filter backend build
```

## 12. Những điều không làm trong refactor

- Không đổi endpoint.
- Không đổi response contract.
- Không sửa database schema.
- Không sửa business logic.
- Không đồng thời triển khai `is_active`, role assignment, Borrow hoặc Repair.
- Không thêm NestJS, DI framework hoặc ORM mới.
- Không sửa file trong `generated/prisma`.
- Không làm một commit “big bang” di chuyển toàn bộ backend.

## 13. Kết luận

Cấu trúc phù hợp nhất với dự án hiện tại là:

```text
src/
  modules/
    auth/
    rbac/
    users/
    assets/
    borrow/
    repair/
  shared/
  events/
  types/
  prisma.ts
  app.ts
  server.ts
```

Nó giúp nhìn thấy đầy đủ một feature trong một thư mục, đồng thời vẫn giữ cách
triển khai Express–Prisma hiện có và ranh giới module đã ghi trong spec.
