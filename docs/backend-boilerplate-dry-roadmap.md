# Backend Boilerplate DRY Roadmap

Tai lieu nay ghi ro backend hien tai dang o muc nao so voi boilerplate, va cac buoc nen tach tiep de tien gan khung chuan:

```txt
app -> routes/index -> feature.routes -> controller -> service -> repository -> prisma
```

Muc tieu la tach dan, khong nhay thang sang base class qua som.

## 1. Khung boilerplate dang lam gi

Boilerplate chia backend theo cac nhom file:

```txt
src/app.ts
src/server.ts
src/routes/index.ts
src/routes/user.routes.ts
src/controllers/user.controller.ts
src/services/user.service.ts
src/repositories/user.repository.ts
src/models/user.model.ts
src/shared/api-response.ts
src/shared/rest-router.ts
src/shared/base.controller.ts
src/shared/base.service.ts
src/shared/base.repository.ts
```

Y tuong chinh:

```txt
routes chi gan URL
controller chi xu ly HTTP request/response
service xu ly business logic
repository xu ly data access
model/DTO la contract du lieu
shared chua code dung chung
```

Luon di theo huong:

```txt
Controller -> Service -> Repository -> Database
```

Khong de controller goi database truc tiep.
Khong de repository biet HTTP request/response.

## 2. Backend hien tai dang o muc nao

Backend cua minh hien tai da co:

```txt
apps/backend/shared/api-response.ts
apps/backend/shared/rest-router.ts
apps/backend/routes/index.ts
apps/backend/routes/user.routes.ts
apps/backend/controllers/user.controller.ts
apps/backend/services/user.service.ts
apps/backend/repositories/user.repository.ts
apps/backend/model/user.model.ts
```

Nghia la da dat duoc cac diem sau:

```txt
Da tach response handler ra shared/api-response.ts
Da tach route helper ra shared/rest-router.ts
Da co RouteDefinition
Da co createRestRouter
Da co DTO trong model/user.model.ts
Da co DI co ban trong user.routes.ts
Da tach UserController, UserService, UserRepository
```

Day la muc:

```txt
Feature-layered backend + shared helpers co ban
```

Chua phai muc boilerplate day du, vi chua co:

```txt
validation shared
formatZodErrors
base.controller.ts
base.service.ts
base.repository.ts
repository interface
error classes/shared error handling
DTO mapping ro rang cho update
```

## 3. Nhung diem hien tai con lech

### 3.1 Service van import prisma

Trong `user.service.ts` hien tai co:

```ts
import prisma from '@/prisma'
```

Neu service khong dung truc tiep nua thi nen xoa import nay.

Quy tac:

```txt
Service khong nen biet Prisma
Repository moi nen biet Prisma
```

### 3.2 Create service tra ve { data, error } nhung controller chua xu ly dung

Service hien tai:

```ts
return { error: 'Email already exists' }
return { data: user }
```

Nhung controller dang lam:

```ts
const user = await this.userService.create(userData)
return ApiResponse.created(res, { user })
```

Neu service tra ve `{ error }`, controller van co the tra 201 sai.

Nen controller xu ly nhu boilerplate:

```ts
const result = await this.userService.create(req.body)

if (result.error || !result.data) {
  return ApiResponse.conflict(res, result.error)
}

return ApiResponse.created(res, result.data)
```

### 3.3 Update dang truyen thang DTO vao Prisma

Repository hien tai:

```ts
update = async (id: number, data: UpdateUserDto) => {
  return this.prisma.users.update({
    where: { id },
    data: data,
  })
}
```

Van de:

```txt
UpdateUserDto dung departmentId
Prisma model dung department_id
```

Neu truyen thang:

```ts
data: { departmentId: 1 }
```

Prisma khong hieu `departmentId`.

Can map DTO sang Prisma data:

```ts
const updateData: any = {}

if (dto.departmentId !== undefined) updateData.department_id = dto.departmentId
if (dto.role !== undefined) updateData.role = dto.role
if (dto.name !== undefined) updateData.name = dto.name
if (dto.email !== undefined) updateData.email = dto.email
if (dto.phone !== undefined) updateData.phone = dto.phone
if (dto.password !== undefined) updateData.password = dto.password
```

### 3.4 Controller parse id chua gon

Dang co dang:

```ts
Number(req.params.id as number)
```

`req.params.id` tu Express luon la string. Nen dung:

```ts
const id = Number(req.params.id)
```

Va nen check:

```ts
if (Number.isNaN(id)) {
  return ApiResponse.badRequest(res, { id: ['Invalid user id'] })
}
```

### 3.5 Delete dang truyen string xuong service/repository

Controller delete hien tai can doi tu:

```ts
this.userService.delete(req.params.id)
```

sang:

```ts
const id = Number(req.params.id)
this.userService.delete(id)
```

Vi Prisma `users.id` la `Int`.

## 4. Buoc tiep theo nen lam

### Buoc 1: Chuan hoa DTO usage

File:

```txt
apps/backend/model/user.model.ts
```

Giu cac type:

```ts
export type Role = 'admin' | 'staff'

export interface CreateUserDto {
  departmentId: number
  role: Role
  name: string
  email: string
  phone: string
  password: string
}

export interface UpdateUserDto {
  departmentId?: number
  role?: Role
  name?: string
  email?: string
  phone?: string
  password?: string
}
```

Quy tac:

```txt
CreateUserDto: field bat buoc
UpdateUserDto: field optional vi PATCH chi update mot phan
```

Dung type o service va repository:

```ts
import type { CreateUserDto, UpdateUserDto } from '@/model/user.model'
```

### Buoc 2: Hoan thien UserRepository

Repository nen co cac method:

```txt
findAll
findById
findByEmail
findByPhone
create
update
delete
```

Repository la noi map DTO sang Prisma field.

Create:

```ts
create = async (dto: CreateUserDto) => {
  return this.prisma.users.create({
    data: {
      department_id: dto.departmentId,
      role: dto.role,
      name: dto.name,
      password: dto.password,
      email: dto.email,
      phone: dto.phone,
    },
  })
}
```

Update:

```ts
update = async (id: number, dto: UpdateUserDto) => {
  const updateData: any = {}

  if (dto.departmentId !== undefined) updateData.department_id = dto.departmentId
  if (dto.role !== undefined) updateData.role = dto.role
  if (dto.name !== undefined) updateData.name = dto.name
  if (dto.email !== undefined) updateData.email = dto.email
  if (dto.phone !== undefined) updateData.phone = dto.phone
  if (dto.password !== undefined) updateData.password = dto.password

  return this.prisma.users.update({
    where: { id },
    data: updateData,
  })
}
```

Ly do khong truyen thang `dto`:

```txt
DTO field: departmentId
Prisma field: department_id
```

### Buoc 3: Lam UserService dung vai tro business logic

Service nen:

```txt
goi repository
check email/phone bi trung
hash password
khong import prisma
khong biet chi tiet Prisma update/create
```

Create nen theo boilerplate:

```ts
create = async (dto: CreateUserDto) => {
  const existingEmail = await this.userRepository.findByEmail(dto.email)
  if (existingEmail) return { error: 'Email already exists' }

  const existingPhone = await this.userRepository.findByPhone(dto.phone)
  if (existingPhone) return { error: 'Phone number already exists' }

  const hashedPassword = await bcrypt.hash(dto.password, 10)
  const user = await this.userRepository.create({
    ...dto,
    password: hashedPassword,
  })

  return { data: user }
}
```

Update nen check unique khi can:

```ts
update = async (id: number, dto: UpdateUserDto) => {
  if (dto.email) {
    const existing = await this.userRepository.findByEmail(dto.email)
    if (existing && existing.id !== id) return { error: 'Email already exists' }
  }

  if (dto.phone) {
    const existing = await this.userRepository.findByPhone(dto.phone)
    if (existing && existing.id !== id) return { error: 'Phone number already exists' }
  }

  const user = await this.userRepository.update(id, dto)
  return { data: user }
}
```

Neu update password, service nen hash password truoc:

```ts
if (dto.password) {
  dto = {
    ...dto,
    password: await bcrypt.hash(dto.password, 10),
  }
}
```

### Buoc 4: Sua UserController theo result pattern

Controller nen:

```txt
parse id tu req.params
validate id co phai number khong
goi service
neu service tra error -> ApiResponse.conflict / badRequest
neu thanh cong -> ApiResponse.ok / created
```

Create:

```ts
create = async (req: Request, res: Response) => {
  try {
    const result = await this.userService.create(req.body)

    if (result.error || !result.data) {
      return ApiResponse.conflict(res, result.error)
    }

    return ApiResponse.created(res, result.data)
  } catch (err) {
    console.error('Create user failed:', err)
    return ApiResponse.internalError(res)
  }
}
```

Update:

```ts
update = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) {
      return ApiResponse.badRequest(res, { id: ['Invalid user id'] })
    }

    const result = await this.userService.update(id, req.body)

    if (result.error || !result.data) {
      return ApiResponse.conflict(res, result.error)
    }

    return ApiResponse.ok(res, result.data)
  } catch (err) {
    console.error('Update user failed:', err)
    return ApiResponse.internalError(res)
  }
}
```

Delete:

```ts
delete = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) {
      return ApiResponse.badRequest(res, { id: ['Invalid user id'] })
    }

    await this.userService.delete(id)
    return ApiResponse.noContent(res)
  } catch (err) {
    console.error('Delete user failed:', err)
    return ApiResponse.internalError(res)
  }
}
```

### Buoc 5: Tach validation shared

Sau khi CRUD chay on, tao:

```txt
apps/backend/shared/validation.ts
```

Neu dung Zod:

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

Co the dat schema trong:

```txt
apps/backend/model/user.model.ts
```

hoac tach rieng:

```txt
apps/backend/validations/user.validation.ts
```

De don gian giai doan dau, co the them vao `user.model.ts`.

### Buoc 6: Them repository interface sau khi code on

Boilerplate co:

```ts
export interface IUserRepository extends IBaseRepository<...> {
  findByEmail(email: string): Promise<User | null>
}
```

Backend cua minh chua can lam ngay neu moi co User.

Nen lam khi:

```txt
can test service bang mock repository
co nhieu repository chung pattern
muon service phu thuoc interface thay vi class cu the
```

Luc do tao:

```txt
apps/backend/repositories/user.repository.ts
```

co the export ca interface va class:

```ts
export interface IUserRepository {
  findAll(): Promise<User[]>
  findById(id: number): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findByPhone(phone: string): Promise<User | null>
  create(dto: CreateUserDto): Promise<User>
  update(id: number, dto: UpdateUserDto): Promise<User>
  delete(id: number): Promise<User>
}
```

Service doi constructor:

```ts
constructor(private userRepository: IUserRepository) {}
```

Loi ich:

```txt
service khong phu thuoc class Prisma repository cu the
co the thay bang mock repository khi test
```

### Buoc 7: Tao base class sau khi co 2-3 module

Chi tao:

```txt
shared/base.controller.ts
shared/base.service.ts
shared/base.repository.ts
```

khi da co nhieu module lap CRUD:

```txt
users
assets
departments
asset_types
```

Neu chi moi co User, base class se lam code kho hoc va kho debug.

Thu tu nen la:

```txt
User CRUD on
Asset CRUD on
Thay User/Asset lap nhieu
Moi tach BaseController/BaseService/BaseRepository
```

## 5. Thu tu thuc hien de it loi nhat

Nen lam theo thu tu nay:

```txt
1. Sua UserController parse id dung number
2. Sua UserController xu ly result { data, error } cua create/update
3. Xoa import prisma trong UserService neu khong dung
4. Doi UserRepository.update map UpdateUserDto sang Prisma data
5. Doi UserService.update check email/phone unique neu body co gui
6. Chay npm run typecheck
7. Test Postman:
   GET    /api/users
   GET    /api/users/1
   POST   /api/users
   PATCH  /api/users/1
   DELETE /api/users/1
8. Sau khi on moi them validation shared
9. Sau khi co them Asset CRUD moi nghi toi base class
```

## 6. Postman mau

Create:

```txt
POST http://localhost:3000/api/users
```

```json
{
  "departmentId": 1,
  "role": "staff",
  "name": "Tran Van Binh",
  "password": "123456",
  "email": "binh.tran@company.com",
  "phone": "0912345678"
}
```

Update partial:

```txt
PATCH http://localhost:3000/api/users/1
```

```json
{
  "phone": "0900000099"
}
```

Khong dung:

```txt
POST /api/users/update/1
```

Vi `createRestRouter` dang khai bao update la:

```txt
PATCH /api/users/:id
```

## 7. Dinh nghia muc tieu sau moi giai doan

### Muc 1: Shared helper co ban

Da co:

```txt
api-response.ts
rest-router.ts
RouteDefinition
createRestRouter
```

Trang thai hien tai dang o muc nay.

### Muc 2: Feature module sach

Can dat:

```txt
controller parse request va response dung
service khong import prisma
repository map DTO sang Prisma
DTO duoc dung o service/repository
create/update/delete chay dung
```

Day la muc nen hoan thanh tiep theo.

### Muc 3: Validation va error handling

Can co:

```txt
shared/validation.ts
formatZodErrors
create/update schema
conflict/badRequest/notFound ro rang
```

### Muc 4: Interface va base class

Chi lam khi co nhieu module.

Can co:

```txt
IUserRepository
IBaseRepository
IBaseService
BaseController
BaseService
BaseRepository
```

## 8. Ket luan

Backend hien tai da di dung huong DRY va giong boilerplate o phan shared response/router.

Buoc tiep theo khong phai tao base class ngay. Buoc tiep theo la lam module User sach truoc:

```txt
DTO dung that
Service chi business logic
Repository chi Prisma
Controller xu ly result va id dung
Update ho tro PATCH partial dung cach
```

Sau khi User va Asset cung lap lai pattern, luc do moi tach `base.controller.ts`, `base.service.ts`, `base.repository.ts`.

