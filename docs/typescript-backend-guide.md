# TypeScript cần học cho backend hiện tại

Repo: `D:\Learning-skill\BigIn\Trainning\train_Bigin_SE`

Phạm vi:

- Backend JavaScript hiện tại: `apps/backend`
- Backend TypeScript mẫu để đối chiếu: `nuxt-nodejs-boilerplate/apps/backend`

Mục tiêu của tài liệu này không phải học toàn bộ TypeScript, mà là học đúng những phần cần để hiểu và chuyển backend hiện tại từ JavaScript sang TypeScript.

---

## 1. Backend hiện tại đang ở trạng thái nào?

Backend hiện tại dùng:

- Node.js
- Express
- Prisma
- MariaDB/MySQL
- JWT
- bcrypt
- JavaScript CommonJS: `require`, `module.exports`

Trong repo cũng có backend TypeScript mẫu tại:

```txt
nuxt-nodejs-boilerplate/apps/backend
```

Backend TS mẫu dùng:

- `src/*.ts`
- `tsconfig.json`
- `tsx watch src/server.ts` khi dev
- `tsc` để build
- `zod` để validate request body
- `interface`, DTO, generic base class

---

## 2. Những điểm JS hiện tại mà TS sẽ giúp bắt lỗi sớm

### 2.1. Đang trộn CommonJS và ES Module

Trong `apps/backend/app.js`:

```js
const express = require('express');
module.exports = app;
```

Trong `apps/backend/server.js`:

```js
import app from './app.js';
```

Đây là hai kiểu module khác nhau.

Khi chuyển sang TypeScript, nên thống nhất dùng:

```ts
import express from 'express'
export default app
```

### 2.2. `package.json` đang trỏ entrypoint chưa thống nhất

Hiện `package.json` có:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

Nhưng backend hiện có `app.js` và `server.js`. Nếu chuyển sang TS, nên rõ ràng:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2.3. Service đang dùng sai kiểu

Trong `UserService.js`, export là class:

```js
class UserService {
  constructor(UserRepository) {
    this.userRepository = UserRepository;
  }
}

module.exports = UserService;
```

Nhưng trong controller lại gọi:

```js
const UserService = require('../services/UserService');
const result = await UserService.getAllUser();
```

Vấn đề: `UserService` là class, chưa được `new UserService(...)`.

TypeScript sẽ dễ bắt lỗi kiểu này nếu khai báo type rõ.

### 2.4. `authorizeRoles(1)` không khớp với middleware

Trong `app.js`:

```js
app.get('/api/users', verifyToken, authorizeRoles(1), handleGetAllUser);
```

Nhưng middleware:

```js
if (!allowedRoles.includes(req.user.roleId)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

`includes` là method của array, nhưng `authorizeRoles(1)` truyền vào number.

Nên sửa theo một trong hai hướng:

```ts
authorizeRoles([1])
```

hoặc tốt hơn:

```ts
authorizeRoles('admin')
```

Nếu dùng rest params:

```ts
authorizeRoles('admin', 'staff')
```

### 2.5. Prisma schema và code đang lệch nhau

Trong `schema.prisma`, model `users` hiện có:

```prisma
model users {
  id            Int        @id @default(autoincrement())
  department_id Int
  role          users_role
  name          String
  password      String
  email         String     @unique
  phone         String     @unique
}

enum users_role {
  admin
  staff
}
```

Nhưng một số code đang dùng:

```js
role_id: roleId
```

Nếu schema thật là `role`, thì code phải dùng:

```ts
role: 'admin'
```

Không phải:

```ts
role_id: 1
```

Khi dùng TypeScript + Prisma generated types, lỗi này sẽ bị báo lúc code/build.

### 2.6. `throw new Error('EMAIL_IN_USE')` nhưng controller check `err.code`

Trong service:

```js
throw new Error('EMAIL_IN_USE');
```

Trong controller:

```js
if (err.code === 'EMAIL_IN_USE') {
  return res.status(400).json({ message: 'Email already in use' });
}
```

`new Error('EMAIL_IN_USE')` không tự tạo `err.code`.

Nên dùng custom error:

```ts
class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message = code
  ) {
    super(message)
  }
}
```

---

## 3. Khác biệt quan trọng giữa JavaScript và TypeScript

| JavaScript hiện tại | TypeScript cần hiểu |
|---|---|
| Biến có thể nhận mọi kiểu | Biến/hàm/object có kiểu cụ thể |
| `req.body` gần như là `any` | Nên có DTO hoặc validate bằng Zod |
| Sai field Prisma chỉ lỗi lúc chạy | Prisma types có thể báo lỗi khi code |
| Class/object sai cách dùng vẫn lọt | Interface/class type giúp bắt mismatch |
| Dùng `require/module.exports` | Nên dùng `import/export` |
| Không có compile step | Có `tsc`, `typecheck`, build ra `dist` |
| Dữ liệu request được tin trực tiếp | Cần validate runtime |

---

## 4. Cú pháp TypeScript cần học

## 4.1. Type annotation cơ bản

```ts
const port: number = Number(process.env.PORT || 3000)
const email: string = 'admin@example.com'
const isAdmin: boolean = true

function add(a: number, b: number): number {
  return a + b
}
```

Dùng để nói rõ:

- Biến là kiểu gì
- Tham số hàm là kiểu gì
- Hàm trả về kiểu gì

---

## 4.2. `interface` và `type`

Dùng nhiều nhất cho:

- User
- DTO
- JWT payload
- API response
- Repository contract

Ví dụ:

```ts
interface RegisterDto {
  departmentId: number
  role: 'admin' | 'staff'
  name: string
  password: string
  email: string
  phone: string
}

type LoginDto = {
  email: string
  password: string
}
```

Nên hiểu đơn giản:

- `interface`: hợp với object/class contract
- `type`: linh hoạt hơn, dùng tốt với union, utility type

---

## 4.3. Optional field

Trong update user, không phải field nào cũng bắt buộc gửi lên.

```ts
interface UpdateUserDto {
  name?: string
  email?: string
  phone?: string
}
```

Dấu `?` nghĩa là field có thể không tồn tại.

Khác với:

```ts
name: string | undefined
```

`name?: string` nghĩa là object có thể không có key `name`.

---

## 4.4. Union type

Union nghĩa là một biến có thể thuộc một trong vài kiểu.

```ts
type UserRole = 'admin' | 'staff'

const role: UserRole = 'admin'
```

Rất hợp với Prisma enum:

```prisma
enum users_role {
  admin
  staff
}
```

---

## 4.5. Nullable

Khi tìm user theo id, có thể không tìm thấy.

```ts
async function findUser(id: number): Promise<User | null> {
  return prisma.users.findUnique({
    where: { id }
  })
}
```

Nên phân biệt:

- `undefined`: chưa có giá trị / field không tồn tại
- `null`: có chủ đích là không có dữ liệu

---

## 4.6. Array type

```ts
const users: User[] = []
```

hoặc:

```ts
const users: Array<User> = []
```

Trong backend nên dùng kiểu ngắn:

```ts
User[]
```

---

## 4.7. `Promise<T>` và async/await

Hàm `async` luôn trả về `Promise`.

```ts
async function getAllUser(): Promise<User[]> {
  return prisma.users.findMany()
}
```

Controller:

```ts
async function handleGetAllUser(req: Request, res: Response): Promise<void> {
  const users = await userService.getAllUser()
  res.status(200).json({ users })
}
```

Với Express controller, return type thường nên là:

```ts
Promise<void>
```

vì controller gửi response qua `res`, không cần return data cho caller.

---

## 4.8. Import/export

Thay vì CommonJS:

```js
const express = require('express')
module.exports = app
```

Dùng TypeScript/ESM:

```ts
import express from 'express'

const app = express()

export default app
```

Named export:

```ts
export function handleLogin() {}
export function handleRegister() {}
```

Import:

```ts
import { handleLogin, handleRegister } from './controllers/auth.controller.js'
```

Nếu dùng `moduleResolution: "NodeNext"`, import file nội bộ thường viết đuôi `.js` kể cả khi source là `.ts`:

```ts
import app from './app.js'
```

TypeScript sẽ hiểu source thật là `app.ts`, còn khi build ra JS thì path vẫn đúng.

---

## 4.9. `import type`

Khi chỉ import type, dùng:

```ts
import type { Request, Response, NextFunction } from 'express'
import type { RegisterDto } from '../models/user.model.js'
```

Lợi ích:

- Rõ cái nào là runtime import
- Rõ cái nào chỉ là type
- Tránh lỗi module/phụ thuộc không cần thiết

---

## 5. Type cho Express backend

Đây là phần quan trọng nhất với backend hiện tại.

### 5.1. Controller

JavaScript hiện tại:

```js
const handleLogin = async (req, res) => {
  const { email, password } = req.body;
}
```

TypeScript:

```ts
import type { Request, Response } from 'express'

export async function handleLogin(
  req: Request,
  res: Response
): Promise<void> {
  const { email, password } = req.body

  res.status(200).json({
    message: 'Login successful'
  })
}
```

Nhưng `req.body` vẫn chưa an toàn. TypeScript không tự biết dữ liệu client gửi lên là gì.

Vì vậy nên validate bằng Zod.

---

### 5.2. Validate request body bằng Zod

```ts
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

type LoginDto = z.infer<typeof loginSchema>
```

Dùng trong controller:

```ts
const parsed = loginSchema.safeParse(req.body)

if (!parsed.success) {
  res.status(400).json({
    message: 'Invalid request body',
    errors: parsed.error.flatten()
  })
  return
}

const dto: LoginDto = parsed.data
```

Không nên làm:

```ts
const dto = req.body as LoginDto
```

Vì `as LoginDto` chỉ ép compiler im lặng, không validate dữ liệu runtime.

---

### 5.3. Middleware JWT

Nên định nghĩa payload rõ:

```ts
type JwtUser = {
  sub: number
  email: string
  name: string
  role: 'admin' | 'staff'
  departmentId: number
}
```

Express `Request` mặc định không có `user`, nên cần mở rộng:

```ts
import type { Request } from 'express'

interface AuthRequest extends Request {
  user?: JwtUser
}
```

Middleware:

```ts
import type { Response, NextFunction, RequestHandler } from 'express'

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  const token = authHeader.split(' ')[1]

  // jwt.verify cần xử lý/cast cẩn thận
  // req.user = decodedPayload

  next()
}
```

Authorize roles:

```ts
export const authorizeRoles = (
  ...allowedRoles: JwtUser['role'][]
): RequestHandler => {
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

Gọi:

```ts
app.get('/api/users', verifyToken, authorizeRoles('admin'), handleGetAllUser)
```

---

## 6. DTO nên có trong backend này

### 6.1. Register DTO

```ts
export interface RegisterDto {
  departmentId: number
  role: 'admin' | 'staff'
  name: string
  password: string
  email: string
  phone: string
}
```

Nếu database thật dùng `role_id`, đổi thành:

```ts
export interface RegisterDto {
  departmentId: number
  roleId: number
  name: string
  password: string
  email: string
  phone: string
}
```

Nhưng hiện `schema.prisma` đang là `role`, không phải `role_id`.

---

### 6.2. Login DTO

```ts
export interface LoginDto {
  email: string
  password: string
}
```

---

### 6.3. Safe user

Không nên trả password ra API.

```ts
export interface SafeUser {
  id: number
  departmentId: number
  role: 'admin' | 'staff'
  name: string
  email: string
  phone: string
}
```

Hoặc nếu dùng Prisma type:

```ts
import type { users } from '../generated/prisma/index.js'

type SafeUser = Omit<users, 'password'>
```

---

## 7. Prisma với TypeScript

Prisma generated client là nguồn type chính cho database.

Ví dụ:

```ts
import { PrismaClient } from './generated/prisma/index.js'
import type { users, users_role } from './generated/prisma/index.js'

const prisma = new PrismaClient()
```

Find user:

```ts
async function findByEmail(email: string): Promise<users | null> {
  return prisma.users.findUnique({
    where: { email }
  })
}
```

Create user theo schema hiện tại:

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

Nếu bạn viết sai:

```ts
role_id: dto.roleId
```

TypeScript + Prisma sẽ báo lỗi nếu schema không có field `role_id`.

---

## 8. Service và Repository trong TS

### 8.1. Repository interface

```ts
import type { users } from '../generated/prisma/index.js'

export interface IUserRepository {
  findAll(): Promise<users[]>
  findById(id: number): Promise<users | null>
  findByEmail(email: string): Promise<users | null>
}
```

### 8.2. Repository class

```ts
import type { PrismaClient, users } from '../generated/prisma/index.js'

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<users[]> {
    return this.prisma.users.findMany()
  }

  findById(id: number): Promise<users | null> {
    return this.prisma.users.findUnique({
      where: { id }
    })
  }

  findByEmail(email: string): Promise<users | null> {
    return this.prisma.users.findUnique({
      where: { email }
    })
  }
}
```

### 8.3. Service class

```ts
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getAllUser(): Promise<users[]> {
    return this.userRepository.findAll()
  }

  async getUserById(id: number): Promise<users | null> {
    return this.userRepository.findById(id)
  }
}
```

Điểm quan trọng:

```ts
constructor(private readonly userRepository: IUserRepository) {}
```

Dòng này vừa:

- Nhận dependency qua constructor
- Tạo property `this.userRepository`
- Chặn sửa lại repository sau khi khởi tạo bằng `readonly`

---

## 9. Generic học sau

Backend TS mẫu có code kiểu:

```ts
export abstract class BaseService<
  TEntity,
  TCreateDto,
  TUpdateDto,
  TRepo extends IBaseRepository<TEntity, TCreateDto, TUpdateDto>
> {}
```

Đây là generic.

Nên hiểu đơn giản:

- `TEntity`: kiểu entity, ví dụ `User`
- `TCreateDto`: kiểu dữ liệu khi tạo
- `TUpdateDto`: kiểu dữ liệu khi update
- `TRepo`: repository tương ứng

Ví dụ đơn giản hơn:

```ts
interface Repository<T> {
  findAll(): Promise<T[]>
  findById(id: number): Promise<T | null>
}

class BaseService<T> {
  constructor(private readonly repo: Repository<T>) {}

  getAll(): Promise<T[]> {
    return this.repo.findAll()
  }
}
```

Chưa cần học generic quá sâu ngay. Với backend hiện tại, ưu tiên Express + DTO + Prisma trước.

---

## 10. Utility types cần biết

### 10.1. `Omit`

Bỏ field khỏi type.

```ts
type SafeUser = Omit<User, 'password'>
```

### 10.2. `Pick`

Chỉ lấy vài field.

```ts
type UserProfile = Pick<User, 'id' | 'name' | 'email'>
```

### 10.3. `Partial`

Biến tất cả field thành optional.

```ts
type UpdateUserDto = Partial<Pick<User, 'name' | 'email' | 'phone'>>
```

---

## 11. Custom error trong TS

Nên thay kiểu này:

```js
throw new Error('EMAIL_IN_USE')
```

bằng:

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

Dùng:

```ts
throw new AppError('EMAIL_IN_USE', 400, 'Email already in use')
```

Controller:

```ts
try {
  const user = await authService.register(dto)
  res.status(201).json({ user })
} catch (err: unknown) {
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

Trong TS strict, `err` nên xử lý như `unknown`, không nên mặc định coi nó có `code`.

---

## 12. `tsconfig.json` cần hiểu

Backend TS mẫu đang dùng:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "baseUrl": ".",
    "rootDir": "src",
    "outDir": "dist",
    "paths": {
      "@/*": ["src/*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Ý nghĩa cần biết:

- `strict: true`: bật kiểm tra type nghiêm túc.
- `rootDir: "src"`: source nằm trong `src`.
- `outDir: "dist"`: build JS ra `dist`.
- `module: "NodeNext"`: dùng module kiểu Node hiện đại.
- `paths`: cho phép import alias như `@/services/user.service.js`.
- `tsc --noEmit`: chỉ check type, không build file.

---

## 13. Lộ trình học cho backend này

### Bước 1: Học type cơ bản

Cần nắm:

- `string`
- `number`
- `boolean`
- `object`
- `array`
- `Promise<T>`
- `null`
- `undefined`
- union type

### Bước 2: Học DTO

Tạo các type:

- `RegisterDto`
- `LoginDto`
- `UpdateUserDto`
- `SafeUser`
- `JwtUser`

### Bước 3: Học Express type

Cần nắm:

- `Request`
- `Response`
- `NextFunction`
- `RequestHandler`
- custom request: `AuthRequest extends Request`

### Bước 4: Học Zod

Dùng để validate:

- `req.body`
- `req.params`
- `req.query`

### Bước 5: Học Prisma generated types

Dùng type sinh từ Prisma thay vì tự đoán field database.

### Bước 6: Học custom error

Để thay lỗi kiểu:

```js
throw new Error('EMAIL_IN_USE')
```

bằng lỗi có:

- `code`
- `status`
- `message`

### Bước 7: Học generic sau

Chỉ cần học generic khi muốn viết:

- `BaseService`
- `BaseRepository`
- `BaseController`

---

## 14. Checklist khi chuyển file JS sang TS

Khi chuyển từng file, kiểm tra:

- [ ] File nằm trong `src`.
- [ ] Đổi `.js` thành `.ts`.
- [ ] Dùng `import/export`, không dùng `require/module.exports`.
- [ ] Controller có type `Request`, `Response`.
- [ ] Middleware có type `NextFunction`.
- [ ] Hàm async có return type `Promise<...>`.
- [ ] `req.body` được validate bằng Zod.
- [ ] Service nhận DTO rõ ràng.
- [ ] Repository dùng Prisma generated types.
- [ ] Không dùng `any` nếu chưa thật sự cần.
- [ ] Không dùng `as Type` để thay cho validate runtime.
- [ ] Chạy `tsc --noEmit` sau khi sửa.

---

## 15. Những cú pháp nên tránh khi mới học

Tránh:

```ts
const data: any = req.body
```

Tránh:

```ts
const dto = req.body as RegisterDto
```

Tránh trộn:

```ts
const express = require('express')
import app from './app.js'
```

Tránh tự viết type database thủ công nếu Prisma đã sinh type.

Tránh học generic phức tạp trước khi hiểu:

- DTO
- Express types
- Prisma types
- Zod validation

---

## 16. File nên đọc trong repo

Nên đọc theo thứ tự:

1. `apps/backend/app.js`
2. `apps/backend/controllers/AuthController.js`
3. `apps/backend/controllers/UserController.js`
4. `apps/backend/middleware/Auth.js`
5. `apps/backend/services/AuthService.js`
6. `apps/backend/services/UserService.js`
7. `apps/backend/prisma/schema.prisma`
8. `nuxt-nodejs-boilerplate/apps/backend/src/models/user.model.ts`
9. `nuxt-nodejs-boilerplate/apps/backend/src/shared/base.controller.ts`
10. `nuxt-nodejs-boilerplate/apps/backend/src/shared/base.service.ts`

---

## Kết luận ngắn

Với backend này, thứ tự học TypeScript nên là:

1. Type cơ bản
2. Interface/type cho DTO
3. `Promise<T>`
4. Express `Request`, `Response`, `NextFunction`
5. Custom `AuthRequest`
6. Zod validation
7. Prisma generated types
8. Custom error
9. Import/export ESM
10. Generic/base class sau cùng

Không cần học toàn bộ TypeScript ngay. Mục tiêu thực tế là chuyển được flow Auth/User sang TS mà typecheck bắt được lỗi thật.
