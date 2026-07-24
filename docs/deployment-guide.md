# Hướng dẫn deploy app cho newbie

Mục tiêu khuyến nghị:

```text
Frontend Vue/Vite  -> Vercel
Backend Express    -> Render
Database MySQL     -> Railway MySQL hoặc Aiven for MySQL
```

App này dùng Prisma với `provider = "mysql"`, nên hãy chọn MySQL/MariaDB. Không chọn Neon nếu chưa đổi code/schema, vì Neon là PostgreSQL.

## 1. Chuẩn bị trước khi deploy

Đẩy code lên GitHub trước, vì Vercel và Render deploy dễ nhất từ GitHub.

Kiểm tra local build:

```bash
pnpm install
pnpm --filter backend build
pnpm build:frontend
```

Không commit file `.env` thật. Chỉ dùng `.env.example` để biết cần biến nào.

## 2. Tạo database MySQL

### Cách dễ cho newbie: Railway MySQL

1. Vào Railway, tạo project mới.
2. Bấm `New` -> chọn `Database` -> `MySQL`.
3. Mở service MySQL, lấy các biến kết nối:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQL_URL`

Map sang biến backend như sau:

```env
DB_HOST=<MYSQLHOST>
DB_PORT=<MYSQLPORT>
DB_USER=<MYSQLUSER>
DB_PASSWORD=<MYSQLPASSWORD>
DB_NAME=<MYSQLDATABASE>
DATABASE_URL=<MYSQL_URL>
```

### Nếu bạn muốn dùng Aiven for MySQL

1. Vào Aiven, tạo service `MySQL`.
2. Chờ service chuyển sang trạng thái `Running`.
3. Lấy connection info: host, port, user, password, database.
4. Tạo biến backend tương tự:

```env
DB_HOST=<AIVEN_HOST>
DB_PORT=<AIVEN_PORT>
DB_USER=<AIVEN_USER>
DB_PASSWORD=<AIVEN_PASSWORD>
DB_NAME=<AIVEN_DATABASE>
DATABASE_URL=mysql://<AIVEN_USER>:<AIVEN_PASSWORD>@<AIVEN_HOST>:<AIVEN_PORT>/<AIVEN_DATABASE>
```

Lưu ý: nếu password có ký tự đặc biệt như `@`, `#`, `/`, hãy URL-encode password trong `DATABASE_URL`. Nếu Aiven báo lỗi SSL/TLS khi backend kết nối, app cần bổ sung cấu hình SSL cho MariaDB adapter; lúc đó dùng Railway MySQL sẽ đơn giản hơn cho lần deploy đầu.

## 3. Deploy backend lên Render

Tạo `Web Service` trên Render từ GitHub repo.

Cấu hình service:

```text
Runtime: Node
Root Directory: để trống, dùng repo root
Build Command: pnpm install --frozen-lockfile && pnpm --filter backend exec prisma generate && pnpm --filter backend exec prisma migrate deploy && pnpm --filter backend build
Start Command: pnpm --filter backend start
```

Thêm Environment Variables trên Render:

```env
DB_HOST=<db-host>
DB_PORT=<db-port>
DB_USER=<db-user>
DB_PASSWORD=<db-password>
DB_NAME=<db-name>
DATABASE_URL=mysql://<user>:<password>@<host>:<port>/<database>
JWT_SECRET=<chuoi-random-dai>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<chuoi-random-dai-khac>
REFRESH_TOKEN_EXPIRES_IN=7d
DEFAULT_REGISTER_ROLE_NAME=staff
FRONTEND_ORIGIN=https://<ten-app-vercel>.vercel.app
```

Sau khi deploy backend xong, test:

```text
https://<backend-render>.onrender.com/health
```

Nếu trả về JSON có `status: ok` là backend đã chạy.

## 4. Deploy frontend lên Vercel

Tạo project Vercel từ GitHub repo.

Cấu hình:

```text
Framework Preset: Vite
Root Directory: apps/frontend
Build Command: pnpm build
Output Directory: dist
```

Thêm Environment Variable trên Vercel:

```env
VITE_API_BASE_URL=https://<backend-render>.onrender.com/api
```

Deploy xong, copy URL frontend dạng:

```text
https://<ten-app>.vercel.app
```

Quay lại Render, sửa biến:

```env
FRONTEND_ORIGIN=https://<ten-app>.vercel.app
```

Sau đó redeploy backend.

## 5. Thứ tự deploy đúng

```text
1. Tạo MySQL database
2. Deploy backend lên Render
3. Test /health
4. Deploy frontend lên Vercel
5. Cập nhật FRONTEND_ORIGIN trên Render
6. Redeploy backend
7. Test login/register trên frontend
```

## 6. Lỗi hay gặp

### Frontend gọi API bị CORS

Kiểm tra `FRONTEND_ORIGIN` trên Render phải đúng chính xác URL Vercel, không có dấu `/` cuối.

Đúng:

```env
FRONTEND_ORIGIN=https://my-app.vercel.app
```

Sai:

```env
FRONTEND_ORIGIN=https://my-app.vercel.app/
```

### Frontend vẫn gọi localhost

Thiếu biến Vercel:

```env
VITE_API_BASE_URL=https://<backend-render>.onrender.com/api
```

Sau khi thêm biến, phải redeploy frontend.

### Backend không kết nối được database

Kiểm tra các biến:

```env
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
DATABASE_URL
```

`DB_*` dùng cho backend runtime. `DATABASE_URL` dùng cho Prisma migration.

### Migration lỗi

Chạy migration production bằng:

```bash
pnpm --filter backend exec prisma migrate deploy
```

Không dùng `prisma migrate dev` trên production.

## 7. Link tài liệu chính thức

- Vercel build config: https://vercel.com/docs/builds/configure-a-build
- Render Node/Express deploy: https://render.com/docs/deploy-node-express-app
- Render environment variables: https://render.com/docs/configure-environment-variables
- Railway MySQL: https://docs.railway.com/databases/mysql
- Aiven MySQL: https://aiven.io/docs/products/mysql/howto/create-service
- Prisma migrate deploy: https://docs.prisma.io/docs/cli/migrate/deploy
