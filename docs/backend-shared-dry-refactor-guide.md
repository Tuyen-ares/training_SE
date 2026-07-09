# Backend Shared DRY Refactor Guide

Tai lieu nay ghi lai cach tach dan backend TypeScript hien tai theo huong giong boilerplate:

```txt
app -> routes/index -> feature.routes -> controller -> service -> repository -> prisma
```

Muc tieu khong phai la tach that nhieu file ngay tu dau. Muc tieu la lam cho feature chay dung truoc, sau do thay phan nao bi lap lai thi dua vao `shared`.

## Tu duy chinh

Khi viet backend, dung tach abstraction qua som. Mot cach de lam chac chan hon:

```txt
1 feature chay dung -> them feature thu 2 -> thay code lap -> tach shared
```

Vi du:

```txt
UserController co res.status(200).json(...)
AssetController cung co res.status(200).json(...)
AuthController cung co res.status(400).json(...)
```

Luc nay nen tach `shared/api-response.ts`.

Neu moi chi co 1 controller ma tach qua nhieu base class, code se kho hieu hon vi chua thay ro pattern bi lap.

## Trang thai hien tai cua backend

Backend hien tai dang co cac file quan trong:

```txt
apps/backend/app.ts
apps/backend/routes/index.ts
apps/backend/routes/user.routes.ts
apps/backend/controllers/user.controller.ts
apps/backend/services/user.service.ts
apps/backend/repositories/user.repository.ts
apps/backend/shared/api-response.ts
apps/backend/shared/rest-router.ts
```

Luong dang huong toi:

```txt
app.ts
  -> registerRoutes(app)
    -> user.routes.ts
      -> UserController
        -> UserService
          -> UserRepository
            -> prisma
```

## Giai doan lam feature chay truoc

Khi lam mot module moi, vi du `assets`, nen lam ban ro rang truoc:

```txt
asset.repository.ts
asset.service.ts
asset.controller.ts
asset.routes.ts
```

Ban dau route co the viet truc tiep:

```ts
const router = Router()

router.get('/', controller.getAll)
router.get('/:id', controller.getById)

export default {
  resource: 'assets',
  router,
}
```

Lam cach nay de de debug:

```txt
GET /api/assets
GET /api/assets/1
```

Khi route chay dung roi moi thay phan lap va dua vao `shared`.

## Tach response vao shared

Neu controller nao cung viet:

```ts
return res.status(200).json({ data })
return res.status(404).json({ error: 'Not found' })
return res.status(500).json({ error: 'Internal server error' })
```

Thi dua vao:

```txt
apps/backend/shared/api-response.ts
```

Vi du:

```ts
import type { Response } from 'express'

const DEFAULT_MESSAGES = {
  badRequest: 'Invalid request',
  notFound: 'Resource not found',
  conflict: 'Resource already exists',
  internalError: 'Internal server error',
}

export class ApiResponse {
  static ok<T>(res: Response, data: T): void {
    res.status(200).json({ data })
  }

  static created<T>(res: Response, data: T): void {
    res.status(201).json({ data })
  }

  static noContent(res: Response): void {
    res.status(204).send()
  }

  static badRequest(
    res: Response,
    errors: unknown,
    message: string = DEFAULT_MESSAGES.badRequest,
  ): void {
    res.status(400).json({ error: message, details: errors })
  }

  static notFound(res: Response, message: string = DEFAULT_MESSAGES.notFound): void {
    res.status(404).json({ error: message })
  }

  static conflict(res: Response, message: string = DEFAULT_MESSAGES.conflict): void {
    res.status(409).json({ error: message })
  }

  static internalError(
    res: Response,
    message: string = DEFAULT_MESSAGES.internalError,
  ): void {
    res.status(500).json({ error: message })
  }
}
```

Luc do controller gon hon:

```ts
return ApiResponse.ok(res, result)
return ApiResponse.notFound(res, `User with id ${id} not found`)
return ApiResponse.internalError(res)
```

Loi ich:

```txt
Response format dong nhat
Controller bot lap res.status().json()
Sau nay doi format API chi sua trong api-response.ts
```

## Tach route definition vao shared

Moi file route dang export mot object giong nhau:

```ts
export default {
  resource: 'users',
  router,
}
```

Day la pattern lap lai. Dua type chung vao:

```txt
apps/backend/shared/rest-router.ts
```

```ts
import type { IRouter } from 'express'

export interface RouteDefinition {
  resource: string
  router: IRouter
}
```

Trong `routes/index.ts`:

```ts
import type { Express } from 'express'
import type { RouteDefinition } from '@/shared/rest-router'
import userRoutes from '@/routes/user.routes'

const routes: RouteDefinition[] = [
  userRoutes,
]

export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}
```

Loi ich:

```txt
app.ts khong can biet tung feature route
Them module moi chi can import vao routes/index.ts
Tat ca route deu theo format { resource, router }
```

## Chuan hoa ten method controller

De dung duoc router helper chung, controller can co ten method giong nhau.

Nen huong toi:

```txt
getAll
getById
create
update
delete
```

Thay vi moi controller dat mot kieu:

```txt
handleGetAllUser
handleGetUserById
handleCreateAsset
handleDeleteDepartment
```

Vi du `user.controller.ts`:

```ts
import type { Request, Response } from 'express'
import { ApiResponse } from '@/shared/api-response'
import UserService from '@/services/user.service'

class UserController {
  constructor(private userService: UserService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.userService.getAllUser()
      return ApiResponse.ok(res, users)
    } catch (err) {
      console.error('Get all users failed:', err)
      return ApiResponse.internalError(res)
    }
  }

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id)
      const user = await this.userService.getUserById(id)

      if (!user) {
        return ApiResponse.notFound(res, `User with id ${id} not found`)
      }

      return ApiResponse.ok(res, user)
    } catch (err) {
      console.error('Get user by id failed:', err)
      return ApiResponse.internalError(res)
    }
  }
}

export default UserController
```

Loi ich:

```txt
Route helper co the goi controller.getAll, controller.getById
Moi controller nhin vao deu doan duoc method nao lam viec gi
Giam dat ten tuy y
```

## Tao createRestRouter sau khi controller da chuan

Khi controller da co ten method chung, moi nen tao:

```txt
shared/rest-router.ts
```

Ban can than: neu `createRestRouter` dang gan ca `post`, `patch`, `delete`, nhung controller chua co `create`, `update`, `delete`, Express co the loi vi handler la `undefined`.

Co 2 cach lam.

### Cach 1: chi tao router cho method da co

Phu hop giai doan dau, khi User moi co `getAll` va `getById`.

```ts
import { Router, type IRouter, type RequestHandler } from 'express'

export interface RouteDefinition {
  resource: string
  router: IRouter
}

export interface ReadController {
  getAll: RequestHandler
  getById: RequestHandler
}

export function createReadRouter(controller: ReadController): IRouter {
  const router = Router()

  router.get('/', controller.getAll)
  router.get('/:id', controller.getById)

  return router
}
```

Trong `user.routes.ts`:

```ts
import prisma from '@/prisma'
import UserRepository from '@/repositories/user.repository'
import UserService from '@/services/user.service'
import UserController from '@/controllers/user.controller'
import { createReadRouter } from '@/shared/rest-router'

const repo = new UserRepository(prisma)
const service = new UserService(repo)
const controller = new UserController(service)

export default {
  resource: 'users',
  router: createReadRouter(controller),
}
```

### Cach 2: full REST router khi controller da co du CRUD

Dung khi controller da co:

```txt
getAll
getById
create
update
delete
```

```ts
import { Router, type IRouter, type RequestHandler } from 'express'

export interface RestController {
  getAll: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  delete: RequestHandler
}

export function createRestRouter(controller: RestController): IRouter {
  const router = Router()

  router.get('/', controller.getAll)
  router.get('/:id', controller.getById)
  router.post('/', controller.create)
  router.patch('/:id', controller.update)
  router.delete('/:id', controller.delete)

  return router
}
```

Chi dung cach nay khi controller da implement du method. Neu chua, dung `createReadRouter` truoc.

## Dependency Injection co ban trong route file

File `user.routes.ts` hien dang dong vai tro composition root cho module User.

No lap cac dependency:

```txt
prisma -> repository -> service -> controller -> router
```

Vi du:

```ts
const repo = new UserRepository(prisma)
const service = new UserService(repo)
const controller = new UserController(service)
```

Day la DI co ban:

```txt
UserService khong tu new UserRepository
UserController khong tu new UserService
Dependency duoc dua tu ngoai vao constructor
```

Loi ich:

```txt
Giam tight coupling
De test service bang mock repository
De doi database implementation ma it sua controller/service
```

Khi module nhieu hon, co the tach phan nay ra file rieng nhu:

```txt
modules/user/user.module.ts
```

Nhung hien tai de trong `user.routes.ts` van chap nhan duoc.

## Validation va formatZodErrors

Validation nen tach sau khi co create/update.

Vi du khi dung Zod:

```ts
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})
```

Neu validation loi, Zod tra ve nhieu issue. Co the format lai:

```ts
import { z } from 'zod'

export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_root'
    acc[key] = [...(acc[key] ?? []), issue.message]
    return acc
  }, {})
}
```

Dat trong:

```txt
shared/validation.ts
```

Controller dung:

```ts
const parsed = createUserSchema.safeParse(req.body)

if (!parsed.success) {
  return ApiResponse.badRequest(res, formatZodErrors(parsed.error))
}
```

Khong nen tach validation truoc khi co route `POST`/`PATCH`, vi luc do chua co noi dung de validate.

## Khi nao moi tao BaseService va BaseRepository

Chua nen tao base class qua som.

Chi tao khi nhieu module co CRUD gan giong nhau:

```txt
UserRepository.findAll/findById/create/update/delete
AssetRepository.findAll/findById/create/update/delete
DepartmentRepository.findAll/findById/create/update/delete
```

Luc do moi can:

```txt
shared/base.repository.ts
shared/base.service.ts
shared/base.controller.ts
```

Neu moi co User, base class se lam code kho doc hon.

## Checklist khi tach mot phan vao shared

Moi lan tach, nen kiem tra:

```txt
1. File shared co ten dung chinh ta khong
   Vi du api-response.ts, khong phai api-respone.ts

2. Import co khop ten file khong
   import { ApiResponse } from '@/shared/api-response'

3. Type-only import nen dung import type
   import type { Request, Response } from 'express'

4. Controller co dung method ma router helper can khong
   getAll, getById, create, update, delete

5. Route co test dung URL khong
   GET /api/users
   GET /api/users/1
   Khong phai /api/users?id=1 neu route dang la /:id

6. Chay typecheck
   npm run typecheck

7. Chay dev server
   npm run dev
```

## Huong di gan nhat cho code hien tai

Voi code hien tai, nen lam theo huong nay:

```txt
Giu api-response.ts
Giu RouteDefinition
Dung createReadRouter truoc neu UserController moi co getAll/getById
Khi UserController co create/update/delete thi doi sang createRestRouter
Sau do moi them validation shared
Sau khi co 2-3 module CRUD moi nghi toi BaseService/BaseRepository
```

Ly do:

```txt
It gay loi runtime
Moi lan tach deu co loi ich ro rang
Code van de debug
Khong bi abstraction qua som
```

