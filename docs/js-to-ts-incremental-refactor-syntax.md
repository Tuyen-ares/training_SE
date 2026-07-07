# Hướng dẫn syntax refactor JS sang TS theo kiểu Incremental Migration

Áp dụng cho backend hiện tại:

```txt
apps/backend
```

Mục tiêu: bạn tự refactor từng file từ JavaScript sang TypeScript theo hướng an toàn, không đổi toàn bộ codebase một lúc.

Tài liệu này chỉ hướng dẫn syntax và thứ tự làm. Không yêu cầu đổi ngay toàn bộ project.

---

## 1. Tư duy chính

Không chuyển toàn bộ JS sang TS ngay.

Làm theo kiểu cuốn chiếu:

```txt
Helper / Utility
  -> Model / Type / DTO
  -> Repository
  -> Service
  -> Controller
  -> Route
  -> App / Server
```

Quy tắc:

- File càng ít phụ thuộc thì đổi trước.
- File import nhiều thứ thì đổi sau.
- Không đổi `app.js` / `server.js` đầu tiên.
- Trong giai đoạn đầu, được phép dùng `any` hoặc `unknown` tạm thời.
- Sau khi chạy ổn mới bật strict mạnh hơn.

---

## 2. Cấu hình hybrid nên có trước khi refactor

Nếu bạn muốn cho JS và TS chạy song song, `tsconfig.json` giai đoạn đầu nên cho phép JS:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "allowJs": true,
    "checkJs": false,
    "strict": false,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

Ý nghĩa:

| Option | Ý nghĩa |
|---|---|
| `allowJs: true` | Cho phép file `.ts` import file `.js` |
| `checkJs: false` | Không ép check type toàn bộ JS cũ |
| `strict: false` | Tạm nới lỏng type để migration dễ hơn |
| `rootDir` | Thư mục source |
| `outDir` | Thư mục JS build ra |

Sau này khi ổn mới đổi:

```json
{
  "strict": true,
  "noImplicitAny": true
}
```

---

## 3. Giai đoạn 2: Thứ tự refactor file trong backend hiện tại

Với backend hiện tại, thứ tự hợp lý là:

```txt
1. models / DTO / types
2. prisma wrapper
3. repositories
4. services
5. controllers
6. middleware
7. routes
8. app / server
```

Không nên bắt đầu từ:

```txt
apps/backend/app.js
apps/backend/server.js
```

Vì hai file này đứng ở tầng trên, import nhiều file khác.

---

## 4. Cách đổi tên file

Ví dụ:

```txt
AuthController.js
```

đổi thành:

```txt
auth.controller.ts
```

Nên dùng naming thống nhất:

```txt
controllers/auth.controller.ts
services/auth.service.ts
routes/auth.routes.ts
models/auth.model.ts
middleware/auth.middleware.ts
repositories/user.repository.ts
```

Không bắt buộc, nhưng giúp project dễ đọc hơn.

---

## 5. Syntax TypeScript cần dùng khi refactor

## 5.1. Type annotation cơ bản

JS:

```js
const email = req.body.email;
```

TS:

```ts
const email: string = req.body.email
```

Function:

```ts
function sum(a: number, b: number): number {
  return a + b
}
```

Async function:

```ts
async function getUsers(): Promise<User[]> {
  return []
}
```

---

## 5.2. Interface cho dữ liệu core

Nên tạo type/interface trước khi refactor service/controller.

Ví dụ file:

```txt
models/auth.model.ts
```

Syntax:

```ts
export interface RegisterDto {
  departmentId: number
  role: 'admin' | 'staff'
  name: string
  password: string
  email: string
  phone: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface SafeUser {
  id: number
  departmentId: number
  role: 'admin' | 'staff'
  name: string
  email: string
  phone: string
}

export interface LoginResult {
  token: string
  user: SafeUser
}
```

Nếu database của bạn dùng `roleId` dạng number thì đổi:

```ts
role: 'admin' | 'staff'
```

thành:

```ts
roleId: number
```

Nhưng phải thống nhất với `schema.prisma`.

---

## 5.3. `type` vs `interface`

Dùng `interface` cho object chính:

```ts
interface User {
  id: number
  name: string
}
```

Dùng `type` cho union hoặc biến thể:

```ts
type UserRole = 'admin' | 'staff'
```

Dùng `type` cho utility:

```ts
type SafeUser = Omit<User, 'password'>
```

Quy tắc thực dụng:

- Object DTO: dùng `interface`
- Union: dùng `type`
- `Omit`, `Pick`, `Partial`: dùng `type`

---

## 5.4. Optional field

JS thường cho object thiếu field thoải mái.

TS cần khai báo rõ field nào có thể thiếu:

```ts
interface UpdateUserDto {
  name?: string
  email?: string
  phone?: string
}
```

Dấu `?` nghĩa là field không bắt buộc.

---

## 5.5. Union type

Dùng khi giá trị chỉ được nằm trong một tập cố định:

```ts
type UserRole = 'admin' | 'staff'
type AssetStatus = 'available' | 'borrowed' | 'damaged' | 'in_repair'
```

Ví dụ:

```ts
const role: UserRole = 'admin'
```

Nếu viết:

```ts
const role: UserRole = 'manager'
```

TS sẽ báo lỗi.

---

## 5.6. Return type cho service

Service nên có return type rõ ràng.

```ts
async function login(dto: LoginDto): Promise<LoginResult> {
  // logic
}
```

Nếu có thể không tìm thấy:

```ts
async function getUserById(id: number): Promise<User | null> {
  // logic
}
```

Nếu chỉ thao tác không trả data:

```ts
async function deleteUser(id: number): Promise<void> {
  // logic
}
```

---

## 5.7. Dùng `any` tạm thời

Trong migration, được phép dùng:

```ts
function handleLegacyData(data: any) {
  return data.value
}
```

Nhưng nên comment rõ:

```ts
// TODO: replace any with proper DTO after migration
function handleLegacyData(data: any) {
  return data.value
}
```

Không nên để `any` vĩnh viễn.

---

## 5.8. Ưu tiên `unknown` khi chưa biết dữ liệu

`unknown` an toàn hơn `any`.

```ts
function parseData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase()
  }

  return null
}
```

Khác biệt:

| Kiểu | Ý nghĩa |
|---|---|
| `any` | Bỏ qua kiểm tra type |
| `unknown` | Chưa biết type, phải kiểm tra trước khi dùng |

Trong `catch`, nên dùng `unknown`:

```ts
try {
  // logic
} catch (err: unknown) {
  if (err instanceof Error) {
    console.log(err.message)
  }
}
```

---

## 5.9. `@ts-nocheck` và `@ts-ignore`

Chỉ dùng khi quá bế tắc.

Bỏ check cả file:

```ts
// @ts-nocheck
```

Bỏ check một dòng:

```ts
// @ts-ignore
legacyFunction(value)
```

Nên ghi TODO:

```ts
// @ts-ignore TODO: remove after refactoring legacy service
legacyFunction(value)
```

Không nên lạm dụng vì nó làm mất giá trị của TypeScript.

---

## 6. Refactor Model / DTO trước

Tạo các file type trước để controller/service dùng lại.

Ví dụ nhóm Auth:

```txt
src/models/auth.model.ts
```

Syntax mẫu:

```ts
export interface RegisterDto {
  departmentId: number
  role: 'admin' | 'staff'
  name: string
  password: string
  email: string
  phone: string
}

export interface LoginDto {
  email: string
  password: string
}
```

Nhóm User:

```txt
src/models/user.model.ts
```

Syntax mẫu:

```ts
export interface User {
  id: number
  departmentId: number
  role: 'admin' | 'staff'
  name: string
  password: string
  email: string
  phone: string
}

export type SafeUser = Omit<User, 'password'>

export type UpdateUserDto = Partial<
  Pick<User, 'name' | 'email' | 'phone'>
>
```

---

## 7. Refactor Repository

Repository là tầng gần database.

Nên có interface:

```ts
export interface IUserRepository {
  findAll(): Promise<User[]>
  findById(id: number): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
}
```

Class implement interface:

```ts
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: any) {}

  findAll(): Promise<User[]> {
    return this.prisma.users.findMany()
  }

  findById(id: number): Promise<User | null> {
    return this.prisma.users.findUnique({
      where: { id }
    })
  }
}
```

Giai đoạn đầu có thể dùng:

```ts
private readonly prisma: any
```

Sau đó thay bằng Prisma type chuẩn.

---

## 8. Refactor Service

Service nhận DTO, gọi repository, trả result rõ ràng.

Syntax:

```ts
export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    // logic
  }

  async register(dto: RegisterDto): Promise<SafeUser> {
    // logic
  }
}
```

Nếu service đang là object function, có thể giữ kiểu function:

```ts
export async function login(dto: LoginDto): Promise<LoginResult> {
  // logic
}

export async function register(dto: RegisterDto): Promise<SafeUser> {
  // logic
}
```

Không bắt buộc phải đổi sang class ngay.

Quy tắc:

- Nếu code hiện tại đang function-based, refactor sang TS function trước.
- Sau khi chạy ổn, muốn clean architecture thì mới đổi sang class.

---

## 9. Refactor Controller

Controller Express cần type:

```ts
import type { Request, Response } from 'express'
```

Syntax:

```ts
export async function handleLogin(
  req: Request,
  res: Response
): Promise<void> {
  // logic
}
```

Với Express, controller thường nên trả:

```ts
Promise<void>
```

vì dữ liệu được trả qua:

```ts
res.status(200).json(...)
```

Không cần:

```ts
return res.status(200).json(...)
```

Có thể viết:

```ts
res.status(200).json(...)
return
```

---

## 10. Validate `req.body`

TypeScript không kiểm tra dữ liệu client gửi lên.

Sai:

```ts
const dto = req.body as LoginDto
```

Cách này chỉ ép TypeScript tin, không validate runtime.

Tốt hơn, dùng Zod:

```ts
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

type LoginDto = z.infer<typeof loginSchema>
```

Trong controller:

```ts
const parsed = loginSchema.safeParse(req.body)

if (!parsed.success) {
  res.status(400).json({
    message: 'Invalid request body',
    errors: parsed.error.flatten()
  })
  return
}

const dto = parsed.data
```

Giai đoạn đầu nếu chưa muốn thêm Zod, có thể dùng tạm:

```ts
const dto = req.body as any
```

Nhưng nên thay sau.

---

## 11. Refactor Middleware

Middleware cần:

```ts
import type { Request, Response, NextFunction, RequestHandler } from 'express'
```

Syntax:

```ts
export function middleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  next()
}
```

Nếu middleware thêm `req.user`, cần custom request:

```ts
interface AuthRequest extends Request {
  user?: JwtPayload
}
```

JWT payload:

```ts
interface JwtPayload {
  sub: number
  email: string
  name: string
  role: 'admin' | 'staff'
  departmentId: number
}
```

Authorize role:

```ts
export function authorizeRoles(
  ...allowedRoles: JwtPayload['role'][]
): RequestHandler {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    next()
  }
}
```

---

## 12. Refactor Routes

JS:

```js
const express = require('express')
const router = express.Router()
```

TS:

```ts
import { Router } from 'express'

const router = Router()

export default router
```

Import controller:

```ts
import { handleLogin, handleRegister } from '../controllers/auth.controller'
```

Nếu dùng `module: "NodeNext"` thì nên import có `.js`:

```ts
import { handleLogin, handleRegister } from '../controllers/auth.controller.js'
```

Nếu dùng `module: "CommonJS"` ở giai đoạn hybrid, thường có thể import không cần `.js`:

```ts
import { handleLogin, handleRegister } from '../controllers/auth.controller'
```

---

## 13. Refactor App / Server cuối cùng

App:

```ts
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)

export default app
```

Server:

```ts
import app from './app'

const port = Number(process.env.PORT || 3000)

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
```

Lưu ý:

```ts
app.use('/auth', authRoutes)
```

phù hợp hơn:

```ts
app.post('/auth', authRoutes)
```

Vì route file đã định nghĩa:

```ts
router.post('/login', ...)
router.post('/register', ...)
```

---

## 14. Import JS từ TS trong giai đoạn hybrid

Nếu `allowJs: true`, file `.ts` có thể import file `.js`.

Ví dụ:

```ts
import AuthService from '../services/AuthService'
```

Nếu TypeScript không hiểu module JS, dùng tạm:

```ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AuthService = require('../services/AuthService')
```

Nhưng đây chỉ là giải pháp tạm.

Mục tiêu sau cùng vẫn là đổi service sang TS.

---

## 15. CommonJS sang ES Module

JS cũ:

```js
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

module.exports = { login, register }
```

TS:

```ts
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export { login, register }
```

Default export:

```ts
export default app
```

Named export:

```ts
export function login() {}
export function register() {}
```

Import default:

```ts
import app from './app'
```

Import named:

```ts
import { login, register } from './auth.service'
```

---

## 16. Custom Error thay cho `err.code`

JS hiện tại dễ gặp kiểu:

```js
throw new Error('EMAIL_IN_USE')
```

nhưng controller lại check:

```js
err.code
```

Nên tạo error chuẩn:

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message = code
  ) {
    super(message)
  }
}
```

Dùng trong service:

```ts
throw new AppError('EMAIL_IN_USE', 400, 'Email already in use')
```

Dùng trong controller:

```ts
catch (err: unknown) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message
    })
    return
  }

  res.status(500).json({ message: 'Server error' })
}
```

---

## 17. Prisma type

Giai đoạn đầu có thể dùng:

```ts
const prisma: any = importedPrisma
```

Sau đó nên dùng Prisma generated type.

Ví dụ:

```ts
import type { users, users_role } from '../generated/prisma'
```

Function:

```ts
async function findByEmail(email: string): Promise<users | null> {
  return prisma.users.findUnique({
    where: { email }
  })
}
```

Create:

```ts
async function createUser(dto: {
  departmentId: number
  role: users_role
  name: string
  password: string
  email: string
  phone: string
}): Promise<users> {
  return prisma.users.create({
    data: {
      department_id: dto.departmentId,
      role: dto.role,
      name: dto.name,
      password: dto.password,
      email: dto.email,
      phone: dto.phone
    }
  })
}
```

Quan trọng: type phải khớp `schema.prisma`.

Nếu schema là:

```prisma
role users_role
```

thì code nên dùng:

```ts
role: dto.role
```

không phải:

```ts
role_id: dto.roleId
```

---

## 18. Utility types nên dùng

### `Omit`

Bỏ field:

```ts
type SafeUser = Omit<User, 'password'>
```

### `Pick`

Chọn field:

```ts
type UserProfile = Pick<User, 'id' | 'name' | 'email'>
```

### `Partial`

Biến field thành optional:

```ts
type UpdateUserDto = Partial<Pick<User, 'name' | 'email' | 'phone'>>
```

### `ReturnType`

Lấy return type của function:

```ts
type LoginReturn = ReturnType<typeof login>
```

Với async function, thường cần:

```ts
type AwaitedLoginReturn = Awaited<ReturnType<typeof login>>
```

---

## 19. Checklist khi đổi một file `.js` sang `.ts`

Mỗi lần đổi file, làm theo checklist này:

- [ ] Đổi đuôi file từ `.js` sang `.ts`.
- [ ] Đổi `require` sang `import`.
- [ ] Đổi `module.exports` sang `export`.
- [ ] Thêm type cho tham số function.
- [ ] Thêm return type cho function public.
- [ ] Với async function, dùng `Promise<T>`.
- [ ] Với controller, dùng `Request`, `Response`.
- [ ] Với middleware, dùng `NextFunction`.
- [ ] Với object input, tạo DTO/interface.
- [ ] Với dữ liệu chưa rõ, dùng tạm `unknown` hoặc `any`.
- [ ] Với `catch`, dùng `err: unknown`.
- [ ] Không ép `req.body as Dto` nếu chưa validate.
- [ ] Chạy typecheck.

---

## 20. Checklist theo từng tầng

### Models / DTO

- [ ] Tạo interface cho input.
- [ ] Tạo type cho response.
- [ ] Tạo union cho enum.
- [ ] Tách password khỏi response user.

### Repository

- [ ] Type cho `id`.
- [ ] Type cho return database.
- [ ] Return `Promise<T | null>` nếu có thể không tìm thấy.
- [ ] Không xử lý business logic ở repository.

### Service

- [ ] Nhận DTO.
- [ ] Trả result rõ ràng.
- [ ] Throw `AppError` thay vì `Error` thường nếu cần mã lỗi.
- [ ] Không phụ thuộc trực tiếp vào `req`, `res`.

### Controller

- [ ] Nhận `Request`, `Response`.
- [ ] Validate `req.body`.
- [ ] Gọi service.
- [ ] Map error thành HTTP response.
- [ ] Không chứa business logic quá nhiều.

### Middleware

- [ ] Dùng `NextFunction`.
- [ ] Nếu thêm field vào `req`, tạo custom request type.
- [ ] Return sau khi `res.status(...).json(...)`.

### Routes

- [ ] Dùng `Router`.
- [ ] Import controller.
- [ ] Export default router.

### App / Server

- [ ] Import routes.
- [ ] Dùng `app.use`.
- [ ] Export app.
- [ ] Server chỉ listen port.

---

## 21. Thứ tự làm đề xuất cho Auth flow

Nếu bạn muốn refactor riêng Auth trước, thứ tự nên là:

```txt
1. models/auth.model.ts
2. errors/app-error.ts
3. services/auth.service.ts
4. controllers/auth.controller.ts
5. routes/auth.routes.ts
6. app.ts
7. server.ts
```

Không nên làm:

```txt
1. app.ts
2. server.ts
3. controller
4. service
```

Vì `app` và `server` phụ thuộc các file bên dưới.

---

## 22. Khi nào được bật strict?

Chưa bật strict ngay nếu:

- Còn nhiều file JS.
- Controller chưa có DTO.
- Service còn nhiều `any`.
- Prisma type chưa ổn.
- App vẫn đang trộn CommonJS và ESM.

Bật strict khi:

- Đa số file core đã là TS.
- App chạy được.
- Typecheck pass.
- Các DTO chính đã rõ.

Sau đó sửa dần:

```json
{
  "strict": true,
  "noImplicitAny": true
}
```

---

## 23. Mức độ chấp nhận trong migration

Giai đoạn đầu được chấp nhận:

```ts
data: any
```

```ts
prisma: any
```

```ts
// @ts-ignore TODO
```

```ts
strict: false
```

Nhưng phải có kế hoạch xóa dần.

Giai đoạn cuối không nên còn:

```ts
any
```

```ts
@ts-ignore
```

```ts
@ts-nocheck
```

```json
"strict": false
```

---

## 24. Kết luận thực tế

Với backend hiện tại, bạn nên học và refactor theo thứ tự:

```txt
Type/interface
DTO
Promise<T>
unknown/any
Express Request/Response/NextFunction
Service return type
Repository return type
Custom Error
Prisma generated type
Route/App/Server cuối cùng
```

Nếu chỉ đổi một file controller sang TS nhưng service, route, app vẫn JS lộn xộn thì migration sẽ khó kiểm soát.

Cách làm ổn nhất là refactor theo từng flow nhỏ, ví dụ:

```txt
Auth flow trước
User flow sau
Asset flow sau nữa
```

Mỗi flow đi từ dưới lên:

```txt
model -> service -> controller -> route -> app
```

