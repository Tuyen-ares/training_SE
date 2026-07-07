# Giải thích dễ hiểu: development, production và Repository interface

Tài liệu này giải thích cách làm của
[`biginx/nuxt-nodejs-boilerplate`](https://github.com/biginx/nuxt-nodejs-boilerplate)
và cách áp dụng vào dự án Express JavaScript + Vue 3 hiện tại.

Mỗi thuật ngữ được giải thích theo 4W:

- **What — Là gì?**
- **Why — Tại sao cần?**
- **When — Khi nào dùng?**
- **Where — Nó nằm hoặc chạy ở đâu?**

## 1. Development và production là gì?

Tên đúng là **production**, không phải `product`.

- `Product` nghĩa là sản phẩm.
- `Production` nghĩa là môi trường chạy sản phẩm thật cho người dùng.
- `Development` nghĩa là môi trường lập trình viên dùng để viết và sửa code.

Một dự án không cần có hai bộ code riêng. Cùng một source code có thể được chạy
theo hai cách khác nhau.

`Source code` là những file lập trình viên trực tiếp viết và sửa, ví dụ:

```text
frontend/src/App.vue
backend/src/server.js
```

### 1.1. Development

#### What — Development là gì?

Development, thường viết tắt là `dev`, là chế độ dùng trong lúc lập trình.

Ví dụ:

```bash
pnpm dev:frontend
pnpm dev:backend
```

Ở chế độ này, chương trình ưu tiên sự thuận tiện cho người viết code:

- Sửa file thì ứng dụng tự cập nhật.
- Hiển thị lỗi chi tiết.
- Khởi động nhanh.
- Không cần chuẩn bị bản cuối cùng trước mỗi lần chạy.

#### Why — Tại sao cần development?

Khi lập trình, chúng ta sửa code liên tục. Nếu mỗi lần sửa một dòng đều phải:

1. Dừng server.
2. Tạo lại toàn bộ bản chạy.
3. Khởi động server.
4. Mở lại trang.

thì sẽ mất nhiều thời gian.

Development giúp vòng lặp này nhanh hơn:

```text
Sửa code → lưu file → ứng dụng tự cập nhật → xem kết quả
```

#### When — Khi nào dùng development?

Dùng khi:

- Đang viết chức năng mới.
- Đang sửa lỗi.
- Đang chạy dự án trên máy cá nhân.
- Đang cần xem thông báo lỗi chi tiết.

Không nên mở development server trực tiếp cho người dùng thật trên Internet.

#### Where — Development chạy ở đâu?

Thường chạy trên máy của lập trình viên:

```text
Vue:     http://localhost:5173
Express: http://localhost:3001
```

`localhost` nghĩa là chính máy tính đang chạy chương trình.

### 1.2. Production

#### What — Production là gì?

Production là chế độ chạy chính thức cho người dùng thật.

Ví dụ:

```text
https://asset.example.com
https://api.asset.example.com
```

Ở chế độ này, chương trình ưu tiên:

- Chạy ổn định.
- Tải nhanh.
- Không tự khởi động lại chỉ vì một file bị sửa.
- Không gửi thông tin lỗi nội bộ cho người dùng.
- Chạy đúng phiên bản đã được chuẩn bị.

#### Why — Tại sao cần production?

Công cụ hỗ trợ lập trình làm development tiện hơn, nhưng cũng dùng thêm tài
nguyên và có thể để lộ thông tin không cần thiết.

Người dùng thật không cần:

- Công cụ tự theo dõi file.
- Thông báo lỗi dài chứa đường dẫn source code.
- HMR của Vue.
- DevTools dành cho lập trình viên.

Họ cần một phiên bản ổn định và tải nhanh.

#### When — Khi nào dùng production?

Dùng khi:

- Đưa website cho người dùng thật.
- Chạy backend trên máy chủ.
- Đưa frontend lên hosting.
- Demo một phiên bản cố định cho khách hàng.

#### Where — Production chạy ở đâu?

Thường chạy trên:

- Máy chủ riêng.
- Azure, AWS, Google Cloud hoặc Fly.io.
- Docker.
- Dịch vụ lưu website tĩnh.

Production cũng có thể chạy thử trên máy cá nhân trước khi đưa lên máy chủ.

## 2. So sánh development và production

| Câu hỏi | Development | Production |
|---|---|---|
| Ai dùng? | Lập trình viên | Người dùng thật |
| Mục tiêu | Sửa code nhanh | Chạy ổn định và nhanh |
| Có tự cập nhật khi sửa file? | Có | Không |
| Lỗi có hiển thị chi tiết? | Thường có | Nên ẩn chi tiết nội bộ |
| Vue chạy bằng gì? | Vite development server | File trong `dist/` |
| Express chạy bằng gì? | `nodemon` | `node` |
| Dùng ở đâu? | Máy cá nhân | Máy chủ hoặc hosting |

Điểm quan trọng:

```text
Development và production không phải hai dự án.
Chúng là hai cách chạy của cùng một dự án.
```

## 3. Watcher là gì?

### What — Watcher là gì?

`Watcher` có nghĩa là công cụ theo dõi sự thay đổi của file.

Nó quan sát các file source code. Khi thấy một file thay đổi, nó thực hiện hành
động đã được cài đặt sẵn.

Ví dụ `nodemon` là một watcher cho backend:

```bash
nodemon src/server.js
```

Luồng hoạt động:

```text
Bạn sửa user.service.js
        ↓
nodemon phát hiện file đã thay đổi
        ↓
nodemon dừng Express cũ
        ↓
nodemon khởi động lại Express
```

### Why — Tại sao cần watcher?

Node.js không tự đọc lại file sau khi server đã chạy. Nếu không có watcher, sau
mỗi lần sửa backend bạn phải tự dừng và chạy lại:

```bash
node src/server.js
```

Watcher thực hiện việc đó tự động.

### When — Khi nào dùng watcher?

Dùng khi đang phát triển ứng dụng.

Không cần watcher trong production vì code trên máy chủ không nên thay đổi liên
tục trong lúc đang chạy.

### Where — Watcher chạy ở đâu?

Watcher chạy trong terminal của lập trình viên.

Trong dự án hiện tại:

```json
{
  "scripts": {
    "dev": "nodemon index.js"
  }
}
```

Khi chạy `npm run dev`, npm thực chất gọi `nodemon index.js`.

## 4. HMR là gì?

### What — HMR là gì?

HMR là viết tắt của **Hot Module Replacement**.

Hiểu đơn giản: khi sửa một phần giao diện Vue, trình duyệt chỉ thay phần cần
thiết thay vì tải lại toàn bộ trang.

Ví dụ:

```text
Sửa màu của nút
      ↓
Vite gửi phần code mới tới trình duyệt
      ↓
Nút đổi màu, trang không tải lại hoàn toàn
```

### Why — Tại sao cần HMR?

Nó giúp:

- Xem thay đổi nhanh.
- Không phải bấm F5 liên tục.
- Có thể giữ lại một phần trạng thái đang có trên trang.

### When — Khi nào dùng HMR?

Chỉ dùng trong development.

### Where — HMR chạy ở đâu?

Vite development server chạy trên máy lập trình viên và kết nối với trình
duyệt.

Lệnh:

```bash
vite
```

hoặc:

```bash
pnpm dev:frontend
```

## 5. Build là gì?

### What — Build là gì?

`Build` là quá trình lấy source code và chuẩn bị thành bản có thể phát hành.

Ví dụ với Vue:

```text
Các file .vue, .js, .css
          ↓ vite build
Các file HTML, JavaScript, CSS trong dist/
```

### Why — Tại sao cần build?

Trình duyệt không chạy trực tiếp dự án Vue theo cách chúng ta tổ chức trong thư
mục `src`.

Vite cần:

- Ghép các file liên quan.
- Chuyển Vue component thành JavaScript mà trình duyệt hiểu.
- Thu nhỏ file để tải nhanh hơn.
- Đặt kết quả vào thư mục `dist`.

`Thu nhỏ file` nghĩa là loại bỏ khoảng trắng và cách viết dài không cần thiết để
giảm dung lượng gửi qua mạng.

### When — Khi nào build?

Dùng khi:

- Chuẩn bị đưa frontend lên hosting.
- Muốn kiểm tra bản gần giống production.
- Tạo bản phát hành mới.

Không cần chạy build sau mỗi lần sửa code trong development.

### Where — Kết quả build nằm ở đâu?

Với Vue 3 + Vite:

```text
apps/frontend/dist/
```

Với backend TypeScript của repo mẫu:

```text
apps/backend/dist/
```

Backend JavaScript hiện tại không cần chuyển TypeScript thành JavaScript, nên
không bắt buộc có bước `build:backend`.

## 6. Artifact là gì?

### What — Artifact là gì?

`Artifact` là kết quả được tạo ra sau bước build.

Có thể hiểu artifact là “gói thành phẩm để đem đi chạy”.

Ví dụ:

```text
Source code Vue       → vite build → thư mục dist/
Source code TypeScript → tsc        → thư mục dist/
```

Thư mục `dist/` trong hai ví dụ trên là artifact.

### Why — Tại sao cần artifact?

Máy chủ chỉ cần bản đã chuẩn bị để chạy. Máy chủ không nhất thiết cần toàn bộ:

- Source code dùng để phát triển.
- Công cụ HMR.
- Watcher.
- File cấu hình dành riêng cho lập trình viên.

Một artifact cố định cũng giúp đảm bảo phiên bản đã kiểm tra chính là phiên bản
được đưa lên máy chủ.

### When — Khi nào dùng artifact?

Dùng khi đưa ứng dụng lên production.

### Where — Artifact nằm ở đâu?

Trong dự án Vue:

```text
frontend/dist/
├── index.html
└── assets/
    ├── app-abc123.js
    └── app-def456.css
```

Các đoạn `abc123` là mã giúp trình duyệt nhận ra file đã thay đổi và không dùng
nhầm bản cũ đã lưu.

## 7. Dev server và production server

### Dev server

`Dev server` là chương trình phục vụ ứng dụng trong lúc phát triển.

Ví dụ:

- Vite phục vụ Vue và cung cấp HMR.
- Nodemon chạy lại Express khi source code thay đổi.

Dev server ưu tiên sự tiện lợi khi viết code.

### Production server

`Production server` là chương trình phục vụ người dùng thật.

Với frontend Vue:

```text
dist/ → Nginx hoặc dịch vụ static hosting → trình duyệt
```

`Static hosting` là dịch vụ chỉ cần gửi các file có sẵn như HTML, JavaScript,
CSS và hình ảnh đến trình duyệt.

Với Express:

```bash
node src/server.js
```

Production server ưu tiên chạy ổn định, không tự theo dõi file.

## 8. Vì sao repo mẫu có `build:backend` còn dự án hiện tại không cần?

Backend của repo mẫu viết bằng TypeScript:

```text
server.ts
```

Node.js production của họ chạy JavaScript:

```text
dist/server.js
```

Do đó họ cần chuyển:

```text
TypeScript → JavaScript
```

Lệnh của repo mẫu:

```bash
pnpm build:backend
```

Thực chất chạy:

```bash
tsc && tsc-alias
```

- `tsc` là chương trình chuyển TypeScript thành JavaScript.
- `tsc-alias` sửa các đường dẫn viết tắt để file JavaScript sau build tìm đúng
  file cần dùng.

Backend hiện tại viết JavaScript ngay từ đầu:

```text
index.js
```

Node.js có thể chạy trực tiếp:

```bash
node index.js
```

Vì vậy:

```text
Repo mẫu TypeScript: cần build backend.
Dự án JavaScript: chưa cần build backend.
```

## 9. Các lệnh root của repo mẫu hoạt động thế nào?

Repo mẫu có nhiều ứng dụng trong một repository:

```text
apps/
├── frontend/
└── backend/
```

Kiểu tổ chức này thường được gọi là `monorepo`.

### Monorepo theo 4W

#### What — Là gì?

Monorepo là một Git repository chứa nhiều phần của cùng hệ thống.

#### Why — Tại sao dùng?

Frontend và backend:

- Cùng nằm trong một repository.
- Có thể dùng chung quy tắc tổ chức.
- Có thể chạy lệnh từ root.
- Dễ biết phiên bản frontend nào đi với phiên bản backend nào.

#### When — Khi nào dùng?

Phù hợp khi frontend và backend thuộc cùng một sản phẩm và cùng nhóm phát triển.

#### Where — Nó nằm ở đâu?

Root chứa file quản lý chung:

```text
package.json
pnpm-workspace.yaml
apps/
```

Repo mẫu khai báo:

```yaml
packages:
  - 'apps/*'
```

Điều đó nói với pnpm rằng các thư mục con trong `apps` là các package của cùng
workspace.

`Workspace` là nhóm package được pnpm quản lý chung.

### `--filter` nghĩa là gì?

Lệnh:

```bash
pnpm --filter frontend dev
```

có nghĩa:

```text
Tìm package tên frontend
          ↓
Chạy script dev của package đó
```

Root script:

```json
{
  "scripts": {
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:backend": "pnpm --filter backend dev"
  }
}
```

Vì vậy:

```bash
pnpm dev:frontend
```

không phải một cách chạy đặc biệt. Nó chỉ là lệnh ngắn giúp chuyển việc chạy đến
đúng thư mục frontend.

## 10. Luồng chạy phù hợp với dự án hiện tại

### Development

Terminal thứ nhất:

```bash
pnpm dev:frontend
```

Luồng:

```text
Root package
    ↓
Package frontend
    ↓
Vite dev server
    ↓
Vue chạy tại localhost
```

Terminal thứ hai:

```bash
pnpm dev:backend
```

Luồng:

```text
Root package
    ↓
Package backend
    ↓
Nodemon
    ↓
Express chạy tại localhost
```

### Production

Frontend:

```bash
pnpm build:frontend
```

Kết quả:

```text
apps/frontend/dist/
```

Đưa thư mục này lên static hosting hoặc Nginx.

Backend:

```bash
pnpm start:backend
```

Kết quả:

```text
Node.js chạy Express trực tiếp, không có nodemon.
```

## 11. Repository là gì?

Trong phần này, `Repository` không có nghĩa là Git repository.

Cùng một từ `repository` được dùng với hai nghĩa:

1. **Git repository:** toàn bộ kho mã nguồn trên GitHub.
2. **Repository trong backend:** phần code chuyên đọc và ghi dữ liệu.

Ở đây đang nói về nghĩa thứ hai.

### What — Repository trong backend là gì?

Repository là phần đứng giữa Service và Prisma/database.

```text
Service → Repository → Prisma → Database
```

Ví dụ:

```js
const findByEmail = (email) => {
  return prisma.users.findFirst({
    where: { email },
  })
}
```

Đoạn code trên thuộc `user.repository.js` vì nhiệm vụ của nó là lấy dữ liệu
user.

### Why — Tại sao dùng Repository?

Để tách hai loại công việc:

- Service quyết định phải làm gì theo quy tắc nghiệp vụ.
- Repository quyết định đọc hoặc ghi dữ liệu bằng cách nào.

Ví dụ:

```text
Service:
"Không được đăng ký email đã tồn tại."

Repository:
"Dùng Prisma để tìm user theo email."
```

Service không cần biết câu lệnh Prisma cụ thể.

### When — Khi nào nên dùng Repository?

Nên dùng khi:

- Service bắt đầu có nhiều câu lệnh Prisma.
- Một truy vấn được dùng ở nhiều service.
- Muốn đổi nơi lưu dữ liệu mà không sửa nghiệp vụ.
- Có nhiều nhóm dữ liệu như users, assets và checkouts.
- Dự án cần cấu trúc thống nhất để nhiều người cùng làm.

Chưa cần tạo cấu trúc Repository quá phức tạp nếu ứng dụng rất nhỏ và mỗi phần
chỉ có một hoặc hai truy vấn đơn giản.

### Where — Repository nằm ở đâu?

```text
backend/src/repositories/
├── user.repository.js
├── asset.repository.js
└── checkout.repository.js
```

## 12. Interface là gì?

### What — Interface là gì?

`Interface` là một bản mô tả các hàm mà một object hoặc class bắt buộc phải có.

Có thể hiểu interface giống một mẫu ổ cắm điện:

```text
Ổ cắm quy định hình dạng đầu cắm.
Thiết bị bên trong hoạt động thế nào là việc của thiết bị.
```

Ví dụ:

```ts
interface IUserRepository {
  findAll(): Promise<User[]>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
}
```

Interface trên nói rằng User Repository phải có:

- `findAll`
- `findById`
- `findByEmail`

Interface không chứa code truy vấn database.

### Why — Tại sao cần interface?

Interface giúp TypeScript kiểm tra sớm:

```text
Service cần findByEmail()
        ↓
Repository quên viết findByEmail()
        ↓
TypeScript báo lỗi trước khi chạy chương trình
```

Nó cũng giúp nhiều cách lưu dữ liệu cùng tuân theo một cách gọi:

```text
IUserRepository
├── MockUserRepository
└── PrismaUserRepository
```

Cả hai phải cung cấp cùng các hàm mà Service cần.

### When — Khi nào nên dùng interface?

Nên dùng khi:

- Dự án dùng TypeScript.
- Có nhiều cách đọc/ghi cùng một loại dữ liệu.
- Nhiều người cùng viết các implementation khác nhau.
- Muốn bảo đảm các class tuân theo cùng một hợp đồng.

`Implementation` nghĩa là phần code thực sự thực hiện công việc được mô tả bởi
interface.

Ví dụ:

- Interface nói: phải có `findByEmail`.
- Implementation dùng Prisma để thực hiện `findByEmail`.

### Where — Interface nằm ở đâu?

Trong repo mẫu:

```text
apps/backend/src/repositories/user.repository.ts
```

Implementation nằm ở:

```text
apps/backend/src/repositories/user.mock.repository.ts
```

## 13. Vì sao repo mẫu dùng Repository interface?

Repo mẫu muốn làm một khung nền có thể tái sử dụng cho nhiều dự án.

Hiện tại repo mẫu chưa dùng database thật. Nó dùng:

```text
MockUserRepository
```

`Mock` nghĩa là dữ liệu giả dùng thay cho hệ thống thật.

Dữ liệu mock của họ nằm trong mảng JavaScript và sẽ mất khi server khởi động
lại.

Họ thiết kế Service phụ thuộc vào interface:

```text
UserService → IUserRepository
```

Hiện tại:

```text
IUserRepository ← MockUserRepository
```

Sau này có thể đổi:

```text
IUserRepository ← PrismaUserRepository
```

`UserService` vẫn gọi:

```ts
repo.findByEmail(email)
```

Do đó UserService không cần biết dữ liệu đang đến từ mảng giả hay database thật.

Luồng tạo object của họ:

```text
Tạo MockUserRepository
          ↓
Đưa repository vào UserService
          ↓
Đưa service vào UserController
          ↓
Đưa controller vào Router
```

Việc đưa một thành phần từ bên ngoài vào thành phần khác thường được gọi là
`Dependency Injection`.

### Dependency Injection theo 4W

#### What — Là gì?

Thành phần cần dùng được truyền từ bên ngoài vào, thay vì tự tạo bên trong.

Ví dụ truyền repository vào service:

```js
const service = new UserService(userRepository)
```

#### Why — Tại sao?

UserService không bị buộc chặt vào một repository cụ thể.

#### When — Khi nào?

Dùng khi muốn dễ thay thế các thành phần hoặc muốn cấu trúc phụ thuộc rõ ràng.

#### Where — Ở đâu?

Repo mẫu lắp các thành phần trong file route:

```text
routes/user.routes.ts
```

## 14. Vì sao dự án hiện tại không dùng Repository interface?

Có ba nguyên nhân chính.

### 14.1. Dự án đang dùng JavaScript

JavaScript không có từ khóa `interface` như TypeScript.

Nếu viết:

```ts
interface IUserRepository {}
```

trong file `.js`, Node.js sẽ không hiểu.

Muốn interface được kiểm tra tự động như repo mẫu, dự án phải dùng TypeScript.

### 14.2. Service đang gọi Prisma trực tiếp

Hiện tại luồng là:

```text
Controller → Service → Prisma
```

Ví dụ `AssetsService.js` tự gọi:

```js
prisma.assets.findMany()
```

Do đó dự án chưa có phần Repository đứng giữa Service và Prisma.

### 14.3. Dự án bắt đầu từ cách đơn giản

Khi học hoặc xây bản đầu tiên, gọi Prisma trực tiếp từ Service dễ hiểu và ít
file hơn.

Đây không phải là sai. Hạn chế chỉ xuất hiện khi:

- Service ngày càng dài.
- Câu truy vấn lặp lại.
- Quy tắc nghiệp vụ và truy vấn database trộn với nhau.
- Nhiều người sửa cùng một file.

## 15. Dự án hiện tại có cần interface không?

Câu trả lời ngắn:

```text
Chưa cần TypeScript interface.
Nên có thư mục Repository.
```

Lý do:

- Dự án đang dùng JavaScript.
- Chỉ có một cách lưu dữ liệu là Prisma + MariaDB.
- Tạo interface giả trong JavaScript không mang lại khả năng kiểm tra như
  TypeScript.
- Tách Prisma khỏi Service đã đem lại phần lớn lợi ích cần thiết.

Cấu trúc đủ dùng:

```text
controllers/
services/
repositories/
```

Không cần ngay:

```text
IBaseRepository
BaseRepository
IUserRepository
IAssetRepository
```

Các lớp `Base` có thể làm code khó hiểu hơn nếu mỗi loại dữ liệu có quy tắc khác
nhau.

## 16. Khi dùng Repository, dự án được lợi gì?

### 16.1. Service dễ đọc hơn

Không dùng Repository:

```js
const register = async (data) => {
  const existing = await prisma.users.findFirst({
    where: { email: data.email },
  })

  if (existing) {
    throw new Error('EMAIL_IN_USE')
  }

  return prisma.users.create({
    data,
  })
}
```

Dùng Repository:

```js
const register = async (data) => {
  const existing = await userRepository.findByEmail(data.email)

  if (existing) {
    throw new Error('EMAIL_IN_USE')
  }

  return userRepository.create(data)
}
```

Service thứ hai gần với cách con người mô tả nghiệp vụ hơn.

### 16.2. Câu lệnh Prisma tập trung một nơi

Toàn bộ truy vấn user nằm trong:

```text
repositories/user.repository.js
```

Khi đổi tên trường hoặc thay cách truy vấn, số file cần tìm ít hơn.

### 16.3. Giảm lặp code

Nếu AuthService và UserService đều cần tìm user theo email, cả hai cùng gọi:

```js
userRepository.findByEmail(email)
```

Không cần viết lại `prisma.users.findFirst` ở hai nơi.

### 16.4. Dễ thay nguồn dữ liệu

Ví dụ sau này dữ liệu asset không nằm trong MariaDB mà đến từ một dịch vụ khác.

Service vẫn gọi:

```js
assetRepository.findById(id)
```

Chỉ phần bên trong repository thay đổi.

### 16.5. Trách nhiệm của file rõ hơn

```text
Controller: nhận request và trả response.
Service: xử lý quy tắc nghiệp vụ.
Repository: đọc và ghi dữ liệu.
```

## 17. Repository có nhược điểm gì?

Repository không phải lúc nào cũng làm dự án tốt hơn.

Chi phí:

- Có thêm thư mục và file.
- Phải chuyển qua nhiều file để theo dõi một request.
- Nếu chỉ bọc lại từng câu Prisma mà không tạo ý nghĩa rõ hơn, code có thể dài
  hơn nhưng không có thêm giá trị.
- Base Repository dùng chung quá sớm có thể không phù hợp với nghiệp vụ checkout.

Ví dụ bọc máy móc:

```js
const findAll = () => prisma.assets.findMany()
```

Với một dự án rất nhỏ, lớp bọc này chưa tạo nhiều giá trị.

Nhưng khi có thêm điều kiện tìm kiếm, quan hệ và nhiều service cùng dùng, việc
tách repository bắt đầu hữu ích.

## 18. Cách áp dụng phù hợp cho dự án hiện tại

Không cần sao chép toàn bộ cách generic của repo mẫu.

`Generic` nghĩa là một đoạn code tổng quát được thiết kế để dùng cho nhiều loại
dữ liệu khác nhau.

Nên làm từng bước:

### Bước 1: Tạo repository cụ thể

```text
backend/repositories/
├── user.repository.js
├── asset.repository.js
└── checkout.repository.js
```

### Bước 2: Chuyển Prisma ra khỏi Service

`asset.repository.js`:

```js
const prisma = require('../prisma')

const findAll = () => prisma.assets.findMany()

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

`asset.service.js`:

```js
const assetRepository = require('../repositories/asset.repository')

const getAllAssets = () => {
  return assetRepository.findAll()
}

const getAssetById = (id) => {
  return assetRepository.findById(id)
}

module.exports = {
  getAllAssets,
  getAssetById,
}
```

### Bước 3: Chỉ dùng Dependency Injection khi thực sự cần thay thế

Ban đầu có thể dùng:

```js
const assetRepository = require('../repositories/asset.repository')
```

Sau này, nếu cần thay repository, mới đổi sang:

```js
const assetService = new AssetService(assetRepository)
```

### Bước 4: Chưa tạo BaseRepository

Asset, user và checkout không hoàn toàn giống nhau.

Checkout có thể cần:

- Kiểm tra asset còn trống.
- Tạo checkout.
- Đổi trạng thái asset.
- Thực hiện các thay đổi cùng nhau.

Ép tất cả vào CRUD dùng chung quá sớm sẽ làm mất ý nghĩa nghiệp vụ.

`CRUD` là bốn thao tác dữ liệu cơ bản:

- Create: tạo.
- Read: đọc.
- Update: cập nhật.
- Delete: xóa.

## 19. Kết luận áp dụng cho dự án

### Development và production

```text
Vue development:
vite

Vue production:
vite build → dist/ → static hosting

Express development:
nodemon src/server.js

Express production:
node src/server.js
```

### Repository

```text
Hiện tại:
Controller → Service → Prisma

Nên chuyển dần thành:
Controller → Service → Repository → Prisma
```

### Interface

```text
Repo mẫu dùng TypeScript:
Có interface để TypeScript kiểm tra hợp đồng.

Dự án hiện tại dùng JavaScript:
Không cần tạo interface giả.
Chỉ cần thống nhất tên hàm và trách nhiệm của repository.
```

### Quyết định thực tế

Nên áp dụng:

- Thư mục `repositories`.
- Tách Prisma khỏi Service.
- Tách `app.js` và `server.js`.
- Lệnh riêng cho development và production.
- Build Vue thành `dist/`.

Chưa cần áp dụng:

- TypeScript interface.
- Generic BaseRepository.
- Build backend JavaScript.
- Sao chép toàn bộ cấu trúc trừu tượng của repo mẫu.
