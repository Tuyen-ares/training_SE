# Kiến trúc thư mục đề xuất cho Express + Vue 3

Tài liệu này tham khảo cách tổ chức của
[`biginx/nuxt-nodejs-boilerplate`](https://github.com/biginx/nuxt-nodejs-boilerplate),
nhưng được điều chỉnh cho dự án hiện tại:

- Frontend: Vue 3 + Vite + Pinia + Vue Router.
- Backend: Express JavaScript.
- Database: Prisma + MariaDB/MySQL.
- Không chuyển sang Nuxt.
- Không chuyển sang TypeScript ở giai đoạn này.
- Không đưa ESLint, test, Zod hoặc CI vào phạm vi kiến trúc hiện tại.

## 1. Cấu trúc hiện tại

Phần ứng dụng chính hiện nằm ở hai thư mục:

```text
train_Bigin_SE/
├── backend/
│   ├── Controller/
│   ├── Middleware/
│   ├── Services/
│   ├── prisma/
│   ├── database.js
│   ├── prisma.js
│   ├── index.js
│   └── package.json
│
├── vue-project/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── router/
│   │   ├── stores/
│   │   └── views/
│   ├── vite.config.js
│   └── package.json
│
├── training/
└── README.md
```

Các phần đang thiếu hoặc chưa rõ trách nhiệm:

1. Chưa có workspace ở root để quản lý frontend và backend cùng nhau.
2. Backend chưa có thư mục `routes`; route đang khai báo trực tiếp trong `index.js`.
3. Backend chưa có lớp `repositories`; service đang gọi Prisma trực tiếp.
4. File khởi tạo Express và file mở cổng server đang nằm chung trong `index.js`.
5. Chưa có thư mục `config` quản lý biến môi trường và kết nối database.
6. Chưa có nơi chứa mã dùng chung như response, error và base repository.
7. Frontend chưa có lớp gọi API riêng; các view sẽ dễ gọi `fetch` trực tiếp và bị lặp code.
8. `.gitignore` đang đặt riêng trong từng ứng dụng, nhưng root chưa có `.gitignore`.
9. `node_modules` và `backend/.env` đã từng được Git theo dõi. Thêm `.gitignore` không tự động bỏ các file đã được track.
10. Các thư mục học tập như `training` đang nằm chung repository với ứng dụng chính, làm phạm vi dự án không rõ ràng.

## 2. Cấu trúc đề xuất

Nên tổ chức thành monorepo giống ý tưởng của repo mẫu, nhưng vẫn giữ Vue 3 và
Express JavaScript:

```text
train_Bigin_SE/
├── apps/
│   ├── frontend/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── composables/
│   │   │   ├── layouts/
│   │   │   ├── router/
│   │   │   ├── services/
│   │   │   │   ├── api-client.js
│   │   │   │   ├── auth-api.js
│   │   │   │   ├── asset-api.js
│   │   │   │   └── user-api.js
│   │   │   ├── stores/
│   │   │   ├── views/
│   │   │   ├── App.vue
│   │   │   └── main.js
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── backend/
│       ├── prisma/
│       │   ├── migrations/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── config/
│       │   │   ├── env.js
│       │   │   └── prisma.js
│       │   ├── controllers/
│       │   │   ├── auth.controller.js
│       │   │   ├── asset.controller.js
│       │   │   └── user.controller.js
│       │   ├── middleware/
│       │   │   └── auth.middleware.js
│       │   ├── repositories/
│       │   │   ├── asset.repository.js
│       │   │   ├── checkout.repository.js
│       │   │   └── user.repository.js
│       │   ├── routes/
│       │   │   ├── auth.routes.js
│       │   │   ├── asset.routes.js
│       │   │   ├── user.routes.js
│       │   │   └── index.js
│       │   ├── services/
│       │   │   ├── auth.service.js
│       │   │   ├── asset.service.js
│       │   │   ├── checkout.service.js
│       │   │   └── user.service.js
│       │   ├── shared/
│       │   │   ├── api-response.js
│       │   │   └── errors.js
│       │   ├── app.js
│       │   └── server.js
│       ├── .env.example
│       └── package.json
│
├── training/
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md
```

Không bắt buộc phải di chuyển thư mục ngay lập tức. Có thể áp dụng cấu trúc bên
trong `backend` trước, sau đó mới đổi `vue-project` thành `apps/frontend`.

## 3. Trách nhiệm của từng tầng backend

Luồng xử lý:

```text
HTTP request
    ↓
Route
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
MariaDB/MySQL
```

### Route

Khai báo URL, HTTP method và middleware:

```js
router.get('/', verifyToken, assetController.getAll)
router.get('/:id', verifyToken, assetController.getById)
router.post('/', verifyToken, assetController.create)
```

Route không chứa truy vấn database hoặc nghiệp vụ.

### Controller

Nhận `req`, gọi service và trả `res`:

```js
const getAll = async (req, res) => {
  const assets = await assetService.getAll()
  return res.status(200).json({ data: assets })
}
```

Controller không gọi Prisma trực tiếp.

### Service

Chứa quy tắc nghiệp vụ:

```js
const checkoutAsset = async (userId, assetId) => {
  const asset = await assetRepository.findById(assetId)

  if (!asset || asset.status !== 'available') {
    throw new Error('ASSET_NOT_AVAILABLE')
  }

  return checkoutRepository.create(userId, assetId)
}
```

Ví dụ quy tắc nghiệp vụ:

- Chỉ checkout asset đang `available`.
- Khi checkout thành công phải đổi trạng thái asset.
- Không cho đăng ký hai tài khoản trùng email.
- Chỉ admin được xóa user.

### Repository

Repository là lớp duy nhất biết cách đọc và ghi dữ liệu:

```js
const prisma = require('../config/prisma')

const findAll = () => {
  return prisma.assets.findMany()
}

const findById = (id) => {
  return prisma.assets.findUnique({
    where: { id: Number(id) },
  })
}

module.exports = {
  findAll,
  findById,
}
```

Service không cần biết dữ liệu đến từ Prisma, mock data hay API khác.

## 4. Repository interface trong repo mẫu là gì?

Trong repo mẫu, TypeScript interface định nghĩa một hợp đồng:

```ts
interface IUserRepository {
  findAll(): Promise<User[]>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: CreateUserDto): Promise<User>
}
```

Interface không truy vấn database. Nó chỉ nói rằng mọi User Repository đều phải
có các hàm trên.

Repo mẫu có thể thay implementation:

```text
IUserRepository
├── MockUserRepository       → dùng mảng trong RAM
└── PrismaUserRepository     → dùng database thật
```

`UserService` chỉ phụ thuộc vào `IUserRepository`, nên không cần thay đổi khi đổi
từ mock data sang Prisma.

JavaScript không có `interface` được kiểm tra lúc compile. Với dự án hiện tại,
có hai lựa chọn:

### Cách đơn giản, phù hợp hiện tại

Quy ước mọi repository export cùng nhóm hàm:

```js
module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
}
```

Không cần tạo base class hoặc interface giả khi dự án mới chỉ có một database.

### Cách có dependency injection

Service nhận repository từ bên ngoài:

```js
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository
  }

  async getAll() {
    return this.userRepository.findAll()
  }
}

module.exports = UserService
```

Nơi lắp ghép các thành phần:

```js
const userRepository = require('../repositories/user.repository')
const UserService = require('../services/user.service')
const UserController = require('../controllers/user.controller')

const userService = new UserService(userRepository)
const userController = new UserController(userService)
```

Đây là kiểu repo mẫu đang làm trong `user.routes.ts`:

```text
new Repository()
    ↓
new Service(repository)
    ↓
new Controller(service)
    ↓
create Router(controller)
```

Điểm quan trọng không phải từ khóa `interface`, mà là Service không phụ thuộc
trực tiếp vào Prisma.

## 5. Vì sao repo mẫu có lệnh dev và production?

Repo mẫu không có hai bộ mã nguồn riêng. Nó dùng cùng source code nhưng có hai
cách chạy.

### Chế độ development

Mục tiêu:

- Khởi động nhanh.
- Tự reload khi sửa file.
- Frontend có HMR.
- Không cần tạo artifact tối ưu trước.

Repo mẫu chạy:

```bash
pnpm dev:frontend
pnpm dev:backend
```

Thực chất root package chuyển lệnh vào từng workspace:

```json
{
  "scripts": {
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:backend": "pnpm --filter backend dev"
  }
}
```

`--filter frontend` nghĩa là chạy script `dev` trong package có tên
`frontend`. Tương tự với `backend`.

### Chế độ production

Mục tiêu:

- Không dùng watcher.
- Không dùng dev server.
- Chạy artifact đã build.
- Nhận cấu hình thật từ biến môi trường của server.

Repo mẫu dùng TypeScript nên backend cần:

```text
src/*.ts
   ↓ tsc
dist/*.js
   ↓ node
production server
```

Vì dự án hiện tại dùng JavaScript, backend không cần `tsc`:

```text
Development: nodemon src/server.js
Production:  node src/server.js
```

Vue 3 vẫn phải build:

```text
src/*.vue
   ↓ vite build
dist/
   ↓ Nginx, static hosting hoặc web server
browser
```

Lưu ý: `vite preview` chỉ dùng để xem thử kết quả build, không phải web server
production chính thức.

## 6. Scripts phù hợp với Express JavaScript + Vue 3

### `apps/frontend/package.json`

```json
{
  "name": "frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### `apps/backend/package.json`

```json
{
  "name": "backend",
  "private": true,
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js"
  }
}
```

### Root `package.json`

```json
{
  "name": "asset-management",
  "private": true,
  "scripts": {
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:backend": "pnpm --filter backend dev",
    "build:frontend": "pnpm --filter frontend build",
    "start:backend": "pnpm --filter backend start"
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
```

Sau đó có thể chạy từ root:

```bash
# Development
pnpm dev:frontend
pnpm dev:backend

# Production artifact
pnpm build:frontend

# Chạy Express không có watcher
pnpm start:backend
```

`build:backend` không cần thiết khi backend vẫn dùng JavaScript.

## 7. Biến môi trường dev và production

Chế độ chạy và cấu hình môi trường là hai vấn đề liên quan nhưng khác nhau.

### Frontend Vite

Vite tự đọc file theo mode:

```text
.env.development   → khi chạy vite
.env.production    → khi chạy vite build
```

Ví dụ:

```env
# .env.development
VITE_API_URL=http://localhost:3001
```

```env
# .env.production
VITE_API_URL=https://api.example.com
```

Trong code:

```js
const apiUrl = import.meta.env.VITE_API_URL
```

Không đặt password database hoặc JWT secret trong frontend. Mọi biến bắt đầu
bằng `VITE_` đều có thể xuất hiện trong JavaScript gửi xuống trình duyệt.

### Backend Express

Development có thể dùng `apps/backend/.env`.

Production nên nhận biến môi trường từ máy chủ hoặc nền tảng deploy:

```text
NODE_ENV=production
PORT=3001
DB_HOST=...
DB_PASSWORD=...
JWT_SECRET=...
```

Không commit `.env.development`, `.env.production` hoặc `.env`. Chỉ commit các
file `.env.example` không chứa giá trị bí mật.

## 8. Root `.gitignore` đề xuất

Repo mẫu dùng một `.gitignore` ở root để áp dụng cho toàn bộ workspace. Dự án
này nên dùng:

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Frontend build
dist/
dist-ssr/

# Backend/generated output
apps/backend/generated/
backend/generated/

# Vite cache
.vite/
*.timestamp-*-*.mjs

# Environment
.env
.env.*
!.env.example

# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*

# Coverage and cache
coverage/
.cache/

# Editor
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Operating system
.DS_Store
Thumbs.db

# Temporary files
*.tmp
```

`node_modules/` không cần viết thành `**/node_modules/`; pattern ở root đã loại
`node_modules` ở mọi cấp.

`.gitignore` chỉ ngăn Git theo dõi file mới. Những file đã được commit vẫn phải
được bỏ khỏi Git index riêng. Trước khi thực hiện cần kiểm tra chắc chắn `.env`
đã có bản sao an toàn và thay các secret từng xuất hiện trong lịch sử Git.

## 9. Thứ tự thay đổi cấu trúc

Thứ tự ít gây gián đoạn nhất:

1. Tạo `.gitignore` ở root.
2. Tạo `routes` và chuyển route ra khỏi `backend/index.js`.
3. Tách `index.js` thành `src/app.js` và `src/server.js`.
4. Tạo `repositories` và chuyển toàn bộ câu lệnh Prisma từ service sang đó.
5. Tạo `config/prisma.js` và `config/env.js`.
6. Tạo `frontend/src/services` để tập trung các lời gọi backend.
7. Thêm root `package.json` và `pnpm-workspace.yaml`.
8. Khi cấu trúc mới chạy ổn định, chuyển thành `apps/frontend` và `apps/backend`.

Không nên vừa di chuyển toàn bộ thư mục, vừa đổi package manager, vừa viết lại
Repository pattern trong một lần. Mỗi bước phải giữ cho ứng dụng vẫn chạy được.
