# Phân tích kiến trúc `biginx/nuxt-nodejs-boilerplate` và hướng áp dụng bằng JavaScript

## 1. Mục tiêu tài liệu

Tài liệu này phân tích repo mẫu:

- Repository: <https://github.com/biginx/nuxt-nodejs-boilerplate>
- Nhánh được đọc: `main`
- Thời điểm đối chiếu: 03/07/2026

Mục tiêu không phải sao chép toàn bộ repo mẫu. Dự án hiện tại đang dùng:

- Backend: Express 5, JavaScript CommonJS, Prisma, MariaDB.
- Frontend: Vue 3, Vite, Pinia, Vue Router.
- Monorepo: pnpm workspace với `apps/backend` và `apps/frontend`.

Repo mẫu dùng:

- Backend: Express 5, TypeScript, Zod, dữ liệu mock.
- Frontend: Nuxt 4 SSR, TypeScript, Nuxt UI, Tailwind.

Phần nên áp dụng là cách chia tầng backend và cách tổ chức workspace. Không nên chuyển frontend sang Nuxt hoặc thay Prisma bằng dữ liệu mock chỉ để giống repo mẫu.

---

## 2. Kết luận kiến trúc

Luồng backend của repo mẫu:

```text
HTTP request
    ↓
server.ts
    ↓
app.ts
    ↓
routes/
    ↓
controllers/
    ↓
services/
    ↓
repositories/
    ↓
data/
```

Các thành phần dùng chung:

```text
shared/
├── base.repository.ts
├── base.service.ts
├── base.controller.ts
├── rest-router.ts
└── api-response.ts
```

Kiến trúc phù hợp cho dự án hiện tại:

```text
HTTP request
    ↓
src/server.js
    ↓
src/app.js
    ↓
src/routes/
    ↓
src/controllers/
    ↓
src/services/
    ↓
src/repositories/
    ↓
Prisma Client
    ↓
MariaDB
```

Khác biệt quan trọng:

- Repo mẫu dùng `BaseMockRepository` để CRUD trên mảng trong bộ nhớ.
- Dự án hiện tại phải dùng repository gọi Prisma.
- JavaScript không có `interface`, generic và kiểm tra kiểu khi compile như TypeScript.
- Có thể dùng class JavaScript, JSDoc và Zod để giữ cấu trúc gần giống.

---

## 3. Cây thư mục repo mẫu

```text
nuxt-nodejs-boilerplate/
├── .editorconfig
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── apps/
    ├── backend/
    │   ├── .env.example
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vitest.config.ts
    │   ├── tests/
    │   │   └── .gitkeep
    │   └── src/
    │       ├── server.ts
    │       ├── app.ts
    │       ├── models/
    │       │   └── user.model.ts
    │       ├── data/
    │       │   └── users.mock.ts
    │       ├── repositories/
    │       │   ├── user.repository.ts
    │       │   └── user.mock.repository.ts
    │       ├── services/
    │       │   └── user.service.ts
    │       ├── controllers/
    │       │   └── user.controller.ts
    │       ├── routes/
    │       │   ├── index.ts
    │       │   └── user.routes.ts
    │       └── shared/
    │           ├── api-response.ts
    │           ├── base.controller.ts
    │           ├── base.repository.ts
    │           ├── base.service.ts
    │           └── rest-router.ts
    └── frontend/
        ├── .editorconfig
        ├── .env.example
        ├── .gitignore
        ├── package.json
        ├── pnpm-workspace.yaml
        ├── nuxt.config.ts
        ├── tsconfig.json
        ├── eslint.config.mjs
        ├── vitest.config.ts
        ├── renovate.json
        ├── README.md
        ├── LICENSE
        ├── public/
        │   └── favicon.ico
        ├── tests/
        │   └── unit/.gitkeep
        ├── .github/
        │   └── workflows/ci.yml
        └── app/
            ├── app.vue
            ├── app.config.ts
            ├── assets/css/main.css
            ├── components/
            │   ├── .gitkeep
            │   ├── AppLogo.vue
            │   └── TemplateMenu.vue
            ├── composables/.gitkeep
            ├── layouts/default.vue
            ├── pages/index.vue
            └── stores/.gitkeep
```

---

## 4. Vai trò từng file ở root

| File | Vai trò |
|---|---|
| `.editorconfig` | Thống nhất indent, encoding, newline và format cơ bản giữa các editor. |
| `.gitignore` | Loại `node_modules`, output build, file môi trường, coverage và file tạm khỏi Git. |
| `package.json` | Khai báo script điều phối cả monorepo: build, lint, test và typecheck frontend/backend. |
| `pnpm-lock.yaml` | Khóa chính xác phiên bản dependency để các máy cài ra cùng một cây package. Không sửa tay. |
| `pnpm-workspace.yaml` | Khai báo tất cả package nằm trong `apps/*`. |
| `README.md` | Mô tả stack, kiến trúc, luồng request và quy trình thêm resource mới. |

Root không chứa code nghiệp vụ. Nó chỉ điều phối workspace.

---

## 5. Phân tích từng file backend repo mẫu

### 5.1 File cấu hình

| File | Vai trò |
|---|---|
| `apps/backend/.env.example` | Mẫu biến `PORT` và `NODE_ENV`; không chứa secret thật. |
| `apps/backend/package.json` | Script dev, build, start, lint, typecheck, test và dependency backend. |
| `apps/backend/tsconfig.json` | Compile `src/` sang `dist/`, bật strict mode và alias `@/*`. |
| `apps/backend/vitest.config.ts` | Tìm test trong `tests/**/*.test.ts`, dùng coverage V8 và threshold 70%. |
| `apps/backend/tests/.gitkeep` | Giữ thư mục test rỗng trong Git. Không có logic. |

Các script backend mẫu:

```text
dev    → tsx watch src/server.ts
build  → tsc && tsc-alias
start  → node dist/server.js
test   → vitest run
```

### 5.2 Entrypoint và cấu hình Express

#### `src/server.ts`

Trách nhiệm duy nhất:

1. Import Express app từ `app.ts`.
2. Đọc `PORT`.
3. Gọi `app.listen()`.

File này là entrypoint khi development. Sau khi build, nó trở thành `dist/server.js` và là entrypoint production.

Không nên khai báo controller, middleware hoặc route chi tiết trong file này.

#### `src/app.ts`

Trách nhiệm:

1. Tạo Express application.
2. Đăng ký middleware toàn cục như CORS và JSON parser.
3. Khai báo health check.
4. Gọi `registerRoutes(app)`.
5. Export `app`.

Việc export app mà chưa gọi `listen()` giúp test API bằng Supertest mà không cần mở cổng thật.

### 5.3 Model

#### `src/models/user.model.ts`

Khai báo kiểu dữ liệu:

- `User`: entity trả về.
- `CreateUserDto`: dữ liệu được phép dùng khi tạo.
- `UpdateUserDto`: dữ liệu được phép cập nhật.

Đây không phải ORM model và không truy cập database. Nó chỉ mô tả contract dữ liệu ở compile time.

Trong JavaScript, có thể thay bằng:

- Zod schema để kiểm tra dữ liệu runtime.
- JSDoc typedef để editor gợi ý kiểu.
- Prisma schema tiếp tục là định nghĩa database.

### 5.4 Data

#### `src/data/users.mock.ts`

Chứa mảng user giả dùng làm database tạm thời cho `MockUserRepository`.

Dự án hiện tại đã có MariaDB và Prisma nên không cần thư mục `data/`, trừ khi cần fixture cho unit test.

### 5.5 Repository

#### `src/repositories/user.repository.ts`

Khai báo contract `IUserRepository`:

- Kế thừa CRUD chung.
- Bổ sung truy vấn riêng `findByEmail()`.

Service chỉ phụ thuộc contract này, không phụ thuộc cách dữ liệu được lưu.

#### `src/repositories/user.mock.repository.ts`

Implementation dùng mảng mock:

- Kế thừa `BaseMockRepository`.
- Nhận dữ liệu seed `mockUsers`.
- Cài đặt `findByEmail()`.

Trong dự án hiện tại, file tương đương nên là `prisma-user.repository.js`, sử dụng:

```js
prisma.users.findMany()
prisma.users.findUnique()
prisma.users.findFirst()
prisma.users.create()
prisma.users.update()
prisma.users.delete()
```

### 5.6 Service

#### `src/services/user.service.ts`

Chứa quy tắc nghiệp vụ:

- Kế thừa CRUD từ `BaseService`.
- Override `create()`.
- Kiểm tra email đã tồn tại trước khi tạo user.

Service không đọc `req`, không ghi `res` và không biết URL nào gọi nó.

### 5.7 Controller

#### `src/controllers/user.controller.ts`

Trách nhiệm:

- Khai báo Zod schema cho create/update.
- Đặt tên resource là `User`.
- Kế thừa năm HTTP handler chung từ `BaseController`.
- Chuyển dữ liệu HTTP sang service và chuyển kết quả service thành response.

Controller không nên gọi Prisma trực tiếp.

### 5.8 Routes

#### `src/routes/user.routes.ts`

Đây là composition root nhỏ cho resource User:

```text
MockUserRepository
    ↓
UserService
    ↓
UserController
    ↓
REST Router
```

File này tạo dependency theo thứ tự và export:

```text
resource: "users"
router: Express Router
```

#### `src/routes/index.ts`

Registry trung tâm của routes:

1. Import từng route module.
2. Đưa route vào mảng.
3. Mount thành `/api/<resource>`.

Khi thêm Product, chỉ cần import `product.routes.ts` và thêm vào mảng. `app.ts` không phải sửa.

### 5.9 Shared

#### `src/shared/base.repository.ts`

Chứa:

- Contract CRUD repository.
- `BaseMockRepository` triển khai CRUD trên mảng.

Nó phù hợp demo và test, nhưng không phải implementation database production.

#### `src/shared/base.service.ts`

Ủy quyền CRUD từ service xuống repository:

- `getAll()`
- `getById()`
- `create()`
- `update()`
- `delete()`

Resource service chỉ override method khi có quy tắc nghiệp vụ riêng.

#### `src/shared/base.controller.ts`

Chứa năm HTTP handler CRUD chung:

- Parse và validate request body bằng Zod.
- Gọi service.
- Trả `400`, `404`, `409`, `500` theo kết quả.
- Format lỗi Zod theo field.

#### `src/shared/rest-router.ts`

Tạo Express Router CRUD chuẩn:

```text
GET    /
GET    /:id
POST   /
PATCH  /:id
DELETE /:id
```

Khi router được mount ở `/api/users`, endpoint đầy đủ là `/api/users/:id`.

#### `src/shared/api-response.ts`

Chuẩn hóa response:

```json
{ "data": {} }
```

hoặc:

```json
{ "error": "message", "details": {} }
```

Mục đích là tránh mỗi controller tự tạo một format JSON khác nhau.

---

## 6. Phân tích từng file frontend repo mẫu

### 6.1 Cấu hình frontend

| File | Vai trò |
|---|---|
| `.env.example` | Khai báo `NUXT_PUBLIC_API_URL`; giá trị public có thể dùng phía browser. |
| `.editorconfig` | Quy tắc format riêng cho package frontend. |
| `.gitignore` | Loại `.nuxt`, `.output`, dependency, log và env khỏi Git. |
| `package.json` | Script Nuxt dev/build/preview, lint, typecheck, test; khai báo Nuxt UI, Pinia, VueUse, Zod. |
| `pnpm-workspace.yaml` | Cấu hình package được phép chạy build script trong package frontend. |
| `nuxt.config.ts` | Bật SSR, module Nuxt, CSS toàn cục, runtime API URL và quy tắc ESLint. |
| `tsconfig.json` | Tham chiếu các TypeScript config do Nuxt sinh trong `.nuxt/`. |
| `eslint.config.mjs` | Dùng ESLint config do Nuxt tạo và là nơi thêm rule riêng. |
| `vitest.config.ts` | Chạy unit test trong môi trường Nuxt với DOM giả `happy-dom`. |
| `renovate.json` | Cấu hình Renovate tự quản lý cập nhật dependency. |
| `.github/workflows/ci.yml` | Pipeline CI của frontend. |
| `README.md` | Hướng dẫn riêng của frontend template. |
| `LICENSE` | Giấy phép của template frontend. |

### 6.2 Source frontend

| File | Vai trò |
|---|---|
| `app/app.vue` | Root component: đặt metadata, bọc Nuxt UI, layout và page hiện tại. |
| `app/app.config.ts` | Cấu hình theme Nuxt UI như màu primary, neutral và kích thước mặc định. |
| `app/assets/css/main.css` | Import Tailwind/Nuxt UI, khai báo theme, scrollbar và utility heading. |
| `app/layouts/default.vue` | Layout mặc định bao quanh nội dung từng page. |
| `app/pages/index.vue` | Page `/` nhờ file-based routing của Nuxt. |
| `app/components/AppLogo.vue` | Component SVG logo. |
| `app/components/TemplateMenu.vue` | Component dropdown chọn template, dùng Nuxt UI. |
| `app/components/.gitkeep` | Giữ thư mục component trong Git. |
| `app/composables/.gitkeep` | Chỗ đặt composable dùng lại như `useApi`, `useAuth`. |
| `app/stores/.gitkeep` | Chỗ đặt Pinia store. |
| `tests/unit/.gitkeep` | Giữ thư mục unit test. |
| `public/favicon.ico` | Static asset được phục vụ nguyên trạng tại `/favicon.ico`. |

### 6.3 Không ánh xạ Nuxt trực tiếp sang Vue/Vite

Frontend hiện tại không cần đổi sang Nuxt. Có thể ánh xạ khái niệm:

| Nuxt mẫu | Vue/Vite hiện tại |
|---|---|
| `app/app.vue` | `src/App.vue` |
| `app/pages/` | `src/views/` và cấu hình `src/router/index.js` |
| `app/layouts/` | `src/components/layout/` |
| `app/components/` | `src/components/` |
| `app/stores/` | `src/stores/` |
| `app/composables/` | `src/composables/` |
| `nuxt.config.ts` runtime config | `import.meta.env.VITE_*` |
| Nuxt SSR build | Vite SPA build |

Không nên thêm `app/pages` hoặc `app/layouts` vào Vue/Vite vì Vue Router không tự tạo route theo file.

---

## 7. Đánh giá backend hiện tại

Cấu trúc hiện tại:

```text
apps/backend/
├── index.js
├── prisma.js
├── database.js
├── prisma.config.ts
├── prisma/schema.prisma
├── controllers/
├── services/
└── middleware/
```

Luồng hiện tại:

```text
index.js
    ↓
controller
    ↓
service
    ↓
Prisma
```

### Điểm đã làm đúng

- Đã tách controller khỏi service.
- Đã dùng Prisma thay vì viết SQL cho nghiệp vụ chính.
- Đã có middleware xác thực JWT.
- Đã là pnpm monorepo với `apps/backend` và `apps/frontend`.
- Development dùng Nodemon; production dùng Node.

### Điểm cần cải thiện

1. `index.js` đang làm cả nhiệm vụ tạo app, đăng ký route và mở server.
2. Route được khai báo trực tiếp trong `index.js`.
3. Service gọi Prisma trực tiếp nên tầng data access chưa được tách.
4. Controller tự lặp lại `try/catch` và format response.
5. Chưa validate request body.
6. `database.js` dùng `mysql2` song song với Prisma và chạy query ngay khi import; không nên nằm trong luồng ứng dụng.
7. `AssetController.js` và `TypeAssets.js` đang rỗng.
8. `AuthService` tạo lỗi bằng `new Error(...)`, nhưng controller kiểm tra `err.code`; code lỗi hiện không được gán.
9. `authorizeRoles()` dùng `.includes()`, nhưng route đang truyền số `1` thay vì mảng `[1]`.
10. JWT đang ký `{ payload }`, nên role nằm ở `req.user.payload.roleId`; middleware lại đọc `req.user.roleId`.
11. `handleGetUserById` chưa khai báo `const` hoặc `function`, tạo biến global trong CommonJS.
12. Prisma Client dùng custom output nên phải generate trước khi start.
13. Chưa có test backend thực tế.

---

## 8. Cấu trúc JavaScript được đề xuất

```text
apps/backend/
├── .env
├── .env.example
├── package.json
├── prisma.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── generated/
│   └── prisma/
├── src/
│   ├── server.js
│   ├── app.js
│   ├── config/
│   │   └── env.js
│   ├── database/
│   │   └── prisma.js
│   ├── models/
│   │   ├── auth.schemas.js
│   │   ├── user.schemas.js
│   │   └── asset.schemas.js
│   ├── repositories/
│   │   ├── user.repository.js
│   │   └── asset.repository.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   └── asset.service.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   └── asset.controller.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── asset.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validate.middleware.js
│   └── shared/
│       ├── api-response.js
│       ├── app-error.js
│       ├── async-handler.js
│       ├── base.repository.js
│       ├── base.service.js
│       ├── base.controller.js
│       └── rest-router.js
└── tests/
    ├── unit/
    └── integration/
```

### Trách nhiệm từng file được đề xuất

| File | Trách nhiệm |
|---|---|
| `src/server.js` | Load env, import app, mở cổng, xử lý shutdown. |
| `src/app.js` | Tạo Express app, middleware toàn cục, health check, routes, error handler. |
| `src/config/env.js` | Kiểm tra và export biến môi trường đã chuẩn hóa. |
| `src/database/prisma.js` | Tạo duy nhất một Prisma Client và export cho repository. |
| `src/models/*.schemas.js` | Zod schema và JSDoc contract cho input/output. |
| `src/repositories/*.repository.js` | Chỉ truy cập Prisma/database. |
| `src/services/*.service.js` | Quy tắc nghiệp vụ, không biết `req`/`res`. |
| `src/controllers/*.controller.js` | Nhận HTTP input, gọi service, trả HTTP output. |
| `src/routes/*.routes.js` | Tạo repository/service/controller và khai báo endpoint. |
| `src/routes/index.js` | Registry mount tất cả route vào app. |
| `src/middlewares/auth.middleware.js` | Verify token và kiểm tra role. |
| `src/middlewares/validate.middleware.js` | Validate body/params/query bằng Zod. |
| `src/middlewares/error.middleware.js` | Error handler cuối pipeline. |
| `src/shared/api-response.js` | Format JSON response thống nhất. |
| `src/shared/app-error.js` | Error có `statusCode`, `code` và details. |
| `src/shared/async-handler.js` | Chuyển rejected Promise sang Express error middleware. |
| `src/shared/base.repository.js` | Contract bằng convention/JSDoc; không chứa mock store trong production. |
| `src/shared/base.service.js` | CRUD service dùng lại nếu thật sự giảm lặp. |
| `src/shared/base.controller.js` | CRUD controller dùng lại cho resource chuẩn. |
| `src/shared/rest-router.js` | Sinh router CRUD chuẩn. |
| `tests/unit/` | Test service với repository giả. |
| `tests/integration/` | Test route/controller/database boundary. |

---

## 9. Mẫu triển khai bằng JavaScript

Các ví dụ dưới đây minh họa kiến trúc, không phải patch đã áp dụng vào source hiện tại.

### 9.1 `src/server.js`

```js
require('./config/env');
const app = require('./app');
const prisma = require('./database/prisma');

const port = Number(process.env.PORT || 3001);

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

### 9.2 `src/app.js`

```js
const express = require('express');
const { registerRoutes } = require('./routes');
const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

registerRoutes(app);
app.use(errorMiddleware);

module.exports = app;
```

### 9.3 `src/database/prisma.js`

```js
const { PrismaClient } = require('../../generated/prisma');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = new PrismaClient({ adapter });
```

### 9.4 `src/repositories/user.repository.js`

```js
class UserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll() {
    return this.prisma.users.findMany();
  }

  findById(id) {
    return this.prisma.users.findUnique({ where: { id } });
  }

  findByEmail(email) {
    return this.prisma.users.findFirst({ where: { email } });
  }

  create(data) {
    return this.prisma.users.create({ data });
  }
}

module.exports = UserRepository;
```

Repository nhận Prisma qua constructor. Nhờ vậy unit test có thể truyền Prisma giả.

### 9.5 `src/services/user.service.js`

```js
const AppError = require('../shared/app-error');

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  getAll() {
    return this.userRepository.findAll();
  }

  async create(input) {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'EMAIL_IN_USE', 'Email already in use');
    }
    return this.userRepository.create(input);
  }
}

module.exports = UserService;
```

### 9.6 `src/controllers/user.controller.js`

```js
class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  getAll = async (_req, res) => {
    const users = await this.userService.getAll();
    res.status(200).json({ data: users });
  };

  create = async (req, res) => {
    const user = await this.userService.create(req.body);
    res.status(201).json({ data: user });
  };
}

module.exports = UserController;
```

Arrow function property giữ đúng `this` khi method được truyền cho Express Router.

### 9.7 `src/routes/user.routes.js`

```js
const { Router } = require('express');
const prisma = require('../database/prisma');
const UserRepository = require('../repositories/user.repository');
const UserService = require('../services/user.service');
const UserController = require('../controllers/user.controller');
const asyncHandler = require('../shared/async-handler');

const repository = new UserRepository(prisma);
const service = new UserService(repository);
const controller = new UserController(service);
const router = Router();

router.get('/', asyncHandler(controller.getAll));
router.post('/', asyncHandler(controller.create));

module.exports = {
  resource: 'users',
  router,
};
```

### 9.8 `src/routes/index.js`

```js
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const assetRoutes = require('./asset.routes');

const routes = [authRoutes, userRoutes, assetRoutes];

function registerRoutes(app) {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router);
  }
}

module.exports = { registerRoutes };
```

---

## 10. Có nên dùng toàn bộ base class của repo mẫu?

Không nên áp dụng ngay toàn bộ.

### Nên áp dụng sớm

- `ApiResponse`
- `AppError`
- `asyncHandler`
- route registry
- tách `server.js` và `app.js`
- repository cho Prisma
- Zod validation

### Chỉ áp dụng khi có ít nhất hai resource CRUD giống nhau

- `BaseService`
- `BaseController`
- `createRestRouter`

### Không nên dùng trong production hiện tại

- `BaseMockRepository` làm data store chính.
- `data/users.mock.js` thay MariaDB.

Base class quá sớm có thể che mất quy tắc nghiệp vụ và làm debug khó hơn. Trước tiên nên hoàn thiện `User` và `Asset` theo từng vertical slice; chỉ trích xuất base class khi đã thấy phần lặp thực tế.

---

## 11. Kế hoạch chuyển đổi an toàn

### Giai đoạn 1: tách entrypoint

1. Tạo `apps/backend/src/server.js`.
2. Tạo `apps/backend/src/app.js`.
3. Di chuyển việc tạo Express app và route khỏi `index.js`.
4. Giữ endpoint hiện tại không đổi.

Kết quả:

```text
server.js → app.js → routes
```

### Giai đoạn 2: gom database

1. Chuyển `prisma.js` thành `src/database/prisma.js`.
2. Không dùng `database.js` trong application runtime.
3. Repository là nơi duy nhất được gọi Prisma.

### Giai đoạn 3: chuyển User trước

1. Tạo `user.repository.js`.
2. Sửa `user.service.js` gọi repository.
3. Chuyển `user.controller.js`.
4. Tạo `user.routes.js`.
5. Viết integration test cho `/api/users`.

### Giai đoạn 4: chuyển Auth

Auth không phải CRUD chuẩn nên không ép kế thừa `BaseController`.

1. Tạo schema register/login.
2. Sửa error code bằng `AppError`.
3. Thống nhất JWT payload.
4. Sửa middleware role nhận mảng role.
5. Không trả password hash trong response.

### Giai đoạn 5: chuyển Asset

Lặp lại:

```text
asset.routes
    → asset.controller
    → asset.service
    → asset.repository
    → Prisma
```

Sau User và Asset, mới đánh giá phần CRUD nào đủ giống để trích xuất base class.

### Giai đoạn 6: test và production

1. Thêm Vitest/Supertest.
2. Test service bằng repository fake.
3. Test authentication middleware.
4. Test route với app export, không mở cổng.
5. Thêm graceful shutdown.
6. Thêm logging và error middleware.

---

## 12. Script đề xuất cho backend JavaScript

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "prisma:generate": "prisma generate --schema prisma/schema.prisma",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Development:

```powershell
pnpm.cmd run dev:backend
```

Production backend:

```powershell
pnpm.cmd --filter backend run prisma:generate
pnpm.cmd run start:backend
```

JavaScript không cần bước `tsc`. Production chạy cùng source JavaScript bằng Node, nhưng dùng `start` thay cho Nodemon.

---

## 13. Kiến trúc frontend nên giữ

Cấu trúc phù hợp cho Vue/Vite hiện tại:

```text
apps/frontend/src/
├── main.js
├── App.vue
├── assets/
├── components/
│   └── layout/
├── composables/
│   ├── useApi.js
│   └── useAuth.js
├── router/
│   └── index.js
├── stores/
├── views/
│   ├── admin/
│   ├── employee/
│   └── login/
└── services/
    ├── api-client.js
    ├── auth-api.js
    └── asset-api.js
```

Nên bổ sung:

- `composables/`: logic Vue tái sử dụng.
- `services/`: HTTP client, không gọi `fetch`/Axios rải rác trong component.
- `tests/unit/`: unit test component/store.
- `VITE_API_URL`: URL backend theo môi trường.

Không cần bổ sung cấu trúc Nuxt:

- `app/`
- file-based `pages/`
- Nuxt `layouts/`
- `nuxt.config.ts`

---

## 14. Nguyên tắc phụ thuộc

Dependency chỉ đi một chiều:

```text
routes
  → controllers
      → services
          → repositories
              → database
```

Quy tắc:

- Repository không import service.
- Service không import controller.
- Controller không import route.
- Service không dùng `req` hoặc `res`.
- Repository không quyết định HTTP status.
- Middleware không chứa nghiệp vụ database phức tạp.
- Prisma không được gọi trực tiếp từ controller.

Đối với Auth:

```text
auth.routes
  → auth.controller
      → auth.service
          → user.repository
              → Prisma
```

---

## 15. Đề xuất cuối cùng

Thiết kế nên tiến gần repo mẫu ở bốn điểm:

1. Tách `server.js` khỏi `app.js`.
2. Dùng route registry thay vì khai báo toàn bộ endpoint trong entrypoint.
3. Thêm repository giữa service và Prisma.
4. Chuẩn hóa validation, error và API response.

Không nên cố giống ở ba điểm:

1. Không chuyển Vue/Vite sang Nuxt nếu không có yêu cầu SSR.
2. Không chuyển JavaScript sang TypeScript chỉ để giống cấu trúc.
3. Không thay Prisma/MariaDB bằng mock repository.

Kiến trúc mục tiêu phù hợp nhất:

```text
Vue/Vite frontend
       ↓ HTTP
Express app
       ↓
Routes
       ↓
Controllers
       ↓
Services
       ↓
Prisma repositories
       ↓
MariaDB
```

Đây là cách giữ công nghệ hiện tại nhưng đạt được mục tiêu chính của repo mẫu: phân tầng rõ ràng, dễ test, dễ thêm resource và không để entrypoint trở thành một file chứa toàn bộ ứng dụng.
