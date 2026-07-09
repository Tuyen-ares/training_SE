# RouteDefinition Pattern Explained

## 1. Bai toan la gi?

Khi backend co nhieu route, neu gan truc tiep trong `app.ts` thi code se thanh:

```ts
import userRoutes from '@/routes/user.routes'
import orderRoutes from '@/routes/order.routes'
import productRoutes from '@/routes/product.routes'

app.use('/api/users', userRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/products', productRoutes)
```

Cach nay de hieu, nhung moi lan them resource moi thi phai sua `app.ts`.

Boilerplate muon `app.ts` chi lo cau hinh Express, khong phai lo tung resource.

## 2. RouteDefinition la gi?

`RouteDefinition` la mot kieu du lieu mo ta "mot route module can co nhung gi".

Vi du:

```ts
import type { Router } from 'express'

export interface RouteDefinition {
  resource: string
  router: Router
}
```

Nghia la moi route module phai co dang:

```ts
export default {
  resource: 'users',
  router: userRouter,
}
```

Trong do:

- `resource`: ten resource tren URL, vi du `users`
- `router`: Express router xu ly cac path ben trong resource do

## 3. Vi sao routes la RouteDefinition[]?

Boilerplate viet:

```ts
const routes: RouteDefinition[] = [
  usersRoute,
  ordersRoute,
]
```

Y nghia: mang `routes` chi duoc chua cac object dung shape:

```ts
{
  resource: string
  router: Router
}
```

Neu ban export sai:

```ts
export default {
  name: 'users',
  route: userRouter,
}
```

TypeScript se bao loi, vi thieu `resource` va `router`.

## 4. registerRoutes lam gi?

```ts
export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}
```

Ham nay lap qua tat ca route module va tu dong mount vao Express app.

Neu co:

```ts
{
  resource: 'users',
  router: userRouter,
}
```

Thi no se mount thanh:

```ts
app.use('/api/users', userRouter)
```

Neu co:

```ts
{
  resource: 'orders',
  router: orderRouter,
}
```

Thi no se mount thanh:

```ts
app.use('/api/orders', orderRouter)
```

## 5. Vi sao dung import type?

```ts
import type { Express } from 'express'
import type { RouteDefinition } from '@/shared/rest-router.js'
```

`import type` noi voi TypeScript rang import nay chi dung cho type, khong can ton tai luc runtime.

Vi du:

```ts
export function registerRoutes(app: Express): void
```

`Express` chi de kiem tra kieu du lieu luc compile. Khi build ra JavaScript, type nay bi xoa.

Loi ich:

- output JavaScript gon hon
- tranh import runtime khong can thiet
- ro rang dau la type, dau la code that

## 6. Loi ich cua pattern nay

Pattern nay giup:

- `app.ts` sach hon
- moi route module co format giong nhau
- prefix `/api` nam mot cho
- TypeScript bat loi neu route export sai shape
- them resource moi chi can sua `routes/index.ts`

Luon nho flow:

```txt
app.ts
  -> registerRoutes(app)
      -> routes/index.ts
          -> user.routes.ts
          -> order.routes.ts
```

## 7. Co bat buoc dung khong?

Khong bat buoc.

Project nho co the viet truc tiep:

```ts
app.use('/api/users', userRoutes)
app.use('/api/orders', orderRoutes)
```

Cach nay nhanh va de hieu.

Nhung khi project lon dan, `RouteDefinition` giup code dong bo hon va it quen prefix/path hon.

## 8. Nen hieu ngan gon

`RouteDefinition` la hop dong.

No noi rang:

> Moi file route muon duoc auto-register thi phai co `resource` va `router`.

`registerRoutes` la nguoi lap qua cac hop dong do va gan vao Express:

```txt
resource: 'users'  +  router  ->  /api/users
resource: 'orders' +  router  ->  /api/orders
```

Day khong phai magic. No chi la mot cach gom cac route lai de `app.ts` khong bi phinh to.

## 9. Vì sao không dùng RouteDefinition mà nhìn vẫn giống boilerplate?

Bạn nói đúng: nếu nhìn bằng mắt, code của bạn vẫn có thể giống boilerplate.

Ví dụ code của bạn:

```ts
const routes = [
  userRoutes,
  orderRoutes,
]

export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}
```

Code boilerplate:

```ts
const routes: RouteDefinition[] = [
  usersRoute,
  ordersRoute,
]

export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}
```

Hai đoạn này chạy gần giống nhau.

Khác biệt nằm ở chỗ:

```txt
Code của bạn: TypeScript tự đoán kiểu của routes.
Boilerplate: TypeScript bị ép kiểm tra routes theo hợp đồng RouteDefinition[].
```

Nói ngắn gọn:

```txt
Không có RouteDefinition: cấu trúc giống, nhưng hợp đồng yếu hơn.
Có RouteDefinition: cấu trúc giống, nhưng hợp đồng rõ hơn.
```

## 10. Ví dụ khi ít code thì khác biệt không rõ

Nếu chỉ có một route:

```ts
const routes = [
  userRoutes,
]
```

Không dùng `RouteDefinition` vẫn ổn.

TypeScript nhìn vào `userRoutes` và có thể tự hiểu object đó có:

```ts
resource
router
```

Lúc này `RouteDefinition` trông hơi thừa.

Đó là lý do bạn cảm thấy:

> Không cần hợp đồng đó thì code vẫn giống boilerplate mà?

Đúng, với project nhỏ thì khác biệt chưa đáng kể.

## 11. Khi thêm nhiều thứ, khác biệt bắt đầu rõ

Giả sử sau này bạn có nhiều route:

```ts
const routes = [
  userRoutes,
  orderRoutes,
  assetRoutes,
  checkoutRoutes,
  departmentRoutes,
  roleRoutes,
]
```

Mỗi file route nên export cùng một kiểu:

```ts
export default {
  resource: 'users',
  router,
}
```

Nhưng nếu một file bị viết sai:

```ts
export default {
  path: 'orders',
  router,
}
```

Hoặc:

```ts
export default {
  resource: 'assets',
  routes,
}
```

Nếu không khai báo `RouteDefinition[]`, TypeScript có thể không báo lỗi rõ ở ngay dòng khai báo `routes`.

Lỗi có thể chỉ xuất hiện ở vòng lặp:

```ts
for (const { resource, router } of routes) {
  app.use(`/api/${resource}`, router)
}
```

Hoặc tệ hơn: code build được, nhưng runtime mount sai path.

Nếu có:

```ts
const routes: RouteDefinition[] = [
  userRoutes,
  orderRoutes,
  assetRoutes,
]
```

TypeScript sẽ kiểm tra từng item trong mảng phải có:

```ts
resource: string
router: Router
```

Sai shape thì báo lỗi sớm hơn.

## 12. So sánh khi project lớn dần

### Code không dùng RouteDefinition

```ts
const routes = [
  userRoutes,
  orderRoutes,
  assetRoutes,
]
```

Ưu điểm:

- ngắn hơn
- dễ viết
- ít khái niệm hơn
- phù hợp khi đang học hoặc project nhỏ

Nhược điểm:

- TypeScript tự suy luận, không có contract rõ ràng
- route module export sai shape thì lỗi có thể khó nhìn hơn
- người mới vào project không thấy ngay route module phải có format gì
- khi nhiều route, sự không đồng bộ dễ xảy ra hơn

### Code boilerplate dùng RouteDefinition

```ts
const routes: RouteDefinition[] = [
  usersRoute,
  ordersRoute,
  assetRoutes,
]
```

Ưu điểm:

- ép mọi route module theo cùng format
- đọc vào biết ngay route cần có `resource` và `router`
- TypeScript bắt lỗi sớm hơn
- dễ scale khi thêm nhiều resource
- hợp với kiến trúc có `shared/`, `base.controller`, `base.service`, `base.repository`

Nhược điểm:

- thêm một khái niệm mới
- ban đầu nhìn dài hơn
- với project nhỏ thì cảm giác hơi dư

## 13. Khác biệt giữa boilerplate và backend của bạn nếu code nhiều lên

Backend của bạn hiện tại đang giống boilerplate ở ý tưởng chính:

```txt
app.ts
  -> routes/index.ts
      -> user.routes.ts
          -> controller
              -> service
                  -> repository
                      -> prisma
```

Đây là hướng tốt.

Nhưng nếu code nhiều lên, boilerplate có thêm vài lớp bảo vệ mà backend của bạn hiện chưa có đầy đủ:

```txt
Boilerplate:
- route có RouteDefinition contract
- service phụ thuộc vào repository interface
- controller/service/repository dùng generic base class
- DTO/model được type rõ
- strict TypeScript bật true
- route prefix /api tập trung ở routes/index.ts

Backend của bạn:
- route đã có resource/router nhưng chưa có type contract rõ
- service vẫn phụ thuộc trực tiếp class repository cụ thể
- một số method vẫn dùng any hoặc thiếu type
- strict đang false
- một số file JS vẫn còn trong backend
- Prisma vẫn bị dùng trực tiếp trong service ở vài chỗ
```

Nói đơn giản:

```txt
Code của bạn giống boilerplate về hình dáng.
Boilerplate mạnh hơn ở phần hợp đồng type và khả năng bắt lỗi sớm.
```

## 14. Vậy bạn có cần RouteDefinition ngay không?

Nếu mục tiêu là học từng bước, bạn có thể chưa cần.

Code này vẫn ổn:

```ts
const routes = [
  userRoutes,
]
```

Nhưng nếu muốn đi sát boilerplate hơn, nên thêm:

```ts
type RouteDefinition = {
  resource: string
  router: Router
}

const routes: RouteDefinition[] = [
  userRoutes,
]
```

Không phải vì nó làm route chạy khác đi.

Mà vì nó nói rõ với TypeScript và với người đọc:

> Mỗi route module trong project này phải export `{ resource, router }`.

Đó là điểm khác biệt chính.
