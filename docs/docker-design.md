# Thiết kế Dockerfile cho BigIn Asset Management

Tài liệu này phân tích **vì sao** Dockerfile/Compose cho dự án phải được thiết kế
như đề xuất, và hướng dẫn chi tiết từng quyết định. Mọi khẳng định đều đối chiếu
trực tiếp với code hiện tại (ghi rõ `file:dòng`). Đây là tài liệu thiết kế tham
khảo — repo hiện **chưa có** `Dockerfile`/`compose` nào được commit.

Tài liệu liên quan: `docs/deployment-guide.md` (deploy thủ công
Vercel/Render), `README.md` (quick start, biến môi trường).

---

## 1. Bản đồ runtime — Docker phải đóng gói cái gì?

### 1.1 Backend (`apps/backend`)

Entry point và vòng đời process nằm ở `apps/backend/src/server.ts`:

```text
validateProductionMediaConfig()   // server.ts:6 — crash ngay nếu NODE_ENV=production mà thiếu media config
port = process.env.PORT || 3000   // server.ts:8 — PORT là runtime env, không bake vào image
runtime.start()                   // server.ts:13 — notification worker chạy cùng process
SIGTERM/SIGINT -> shutdown()      // server.ts:23 — container stop gửi SIGTERM, code đã handle graceful shutdown
```

Ý nghĩa cho Dockerfile:

- `CMD` phải là `node dist/server.js` (khớp `package.json:start`), không phải
  `tsx watch` (dev-only).
- Image phải cho phép Docker/K8s gửi `SIGTERM` tới đúng PID 1 là node (dùng
  exec-form `CMD ["node", "dist/server.js"]`, không bọc shell).
- `PORT` phải đọc từ environment lúc `docker run`, không `ENV PORT` cứng.

HTTP surface nằm ở `apps/backend/src/app.ts`:

- `dotenv.config({ path: ${process.cwd()}/.env })` (`app.ts:5`) và
  `apps/backend/src/prisma.ts:8` — backend tìm `.env` ở **thư mục làm việc
  hiện tại**, không phải cạnh file source. `WORKDIR` trong image phải là nơi
  đặt `.env` (local) hoặc là nơi process chạy khi inject env từ ngoài (prod).
- CORS đọc `FRONTEND_ORIGIN`, split theo dấu phẩy (`app.ts:10-18`); sai một dấu
  `/` cuối là CORS chết — đây là lỗi deploy hay gặp nhất, Docker không sửa
  được, chỉ làm nó **lặp lại nhất quán** nếu env sai.
- Health probe: `GET /health -> { status: "ok" }` (`app.ts:34-36`) — dùng cho
  `HEALTHCHECK` trong Dockerfile và `healthcheck:` trong Compose.

Database nằm ở `apps/backend/src/prisma.ts` + `apps/backend/prisma.config.ts`:

- Runtime (`prisma.ts:10-18`) kết nối bằng bộ `DB_HOST/DB_PORT/DB_USER/
  DB_PASSWORD/DB_NAME` qua `@prisma/adapter-mariadb`. Không có `DATABASE_URL`
  ở runtime.
- Prisma CLI (`prisma.config.ts:6-15`) dựng connection URL từ **cùng bộ
  `DB_*`**, chỉ fallback sang `DATABASE_URL` khi thiếu. Kết luận: container chỉ
  cần cấp đủ bộ `DB_*` là cả runtime lẫn `migrate deploy` đều chạy — nhưng
  `deployment-guide.md` vẫn yêu cầu cả hai, cứ cấp cả hai cho an toàn.
- Client được generate vào `apps/backend/generated/prisma` (`prisma.ts:3-6`),
  thư mục này **bị gitignore** nên image không thể `COPY` từ host — bắt buộc
  chạy `prisma generate` **bên trong** build.

Build TypeScript (`apps/backend/tsconfig.json:16-20`):

- `baseUrl: .` + `paths: @/* -> src/*`, `rootDir: src`, `outDir: ./dist`,
  cộng `tsc-alias` (`package.json:build`). Image build stage phải chạy đủ
  `tsc -p tsconfig.json && tsc-alias -p tsconfig.json`, thiếu `tsc-alias` là
  runtime crash vì import `@/...` không resolve được.

### 1.2 Frontend (`apps/frontend`)

- `vite build` (`package.json:build`) ra `dist/` tĩnh. Không có SSR, không có
  server Node — image runtime chỉ cần **static server** (nginx), không cần Node.
- `VITE_API_BASE_URL` (`apps/frontend/.env.example:1`) và cả chùm
  `VITE_FIREBASE_*` (`apps/frontend/.env.example:8-16`) được **nhúng vào bundle
  lúc build**. Đổi URL sau build = build lại image. Trong Dockerfile đây là
  `ARG` (build-time), không phải `ENV` (run-time) — nhầm lẫn hai loại này là lỗi
  Docker phổ biến nhất của frontend Vite.
- SPA fallback: `apps/frontend/vercel.json:1-8` rewrite mọi path về
  `/index.html`. Nginx trong image phải có `try_files $uri /index.html`, nếu
  không refresh `/assets/:id`, `/qr/:qrCode` sẽ 404 (đã ghi ở `README.md`).
- Chú ý: `apps/frontend/package.json` đang lẫn `bcrypt/cors/jsonwebtoken/
  express-validator` — dependency của backend lọt sang frontend, làm image build
  chậm và có rủi ro native-build không cần thiết. Dọn sau, không chặn Docker.

### 1.3 Hạ tầng ngoài container (giữ nguyên, không docker hóa)

- Media: direct-to-S3 presigned PUT + đọc qua CloudFront (`README.md` media
  flow). S3/bucket/OAC/IAM không nằm trong Compose.
- DB prod hiện tại: managed MySQL (Railway/Aiven). Compose prod có thể chạy DB
  riêng, nhưng DB prod trong container đòi volume + backup — xem §6.

---

## 2. Thiết kế `Dockerfile.backend` — từng stage vì sao tồn tại

Thiết kế đề xuất là **multi-stage 3 tầng** trên `node:20-bookworm-slim`
(pin theo `README.md`: Node `^20.19.0 || >=22.12.0`, `pnpm@10.32.1` qua
corepack).

```dockerfile
# ---- Stage 1: deps ----
FROM node:20-bookworm-slim AS deps
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN pnpm install --frozen-lockfile
# Vì sao: copy lockfile trước, source sau -> tận dụng layer cache.
# Đổi code không làm mất cache install. Dùng root lockfile, KHÔNG dùng
# package-lock.json lẻ (đã bị .gitignore, xem §7.5).
# Vì sao install FULL (không --filter): pnpm dựng symlink giữa
# apps/backend/node_modules và root .pnpm-store; install thiếu là gãy binary
# (thực tế đã gãy: prisma MODULE_NOT_FOUND ở lần build đầu).

# ---- Stage 2: build ----
FROM node:20-bookworm-slim AS build
# + corepack/pnpm như trên
WORKDIR /app
COPY --from=deps /app /app
COPY . .
# Copy NGUYÊN /app 1 lần để giữ symlink pnpm; .dockerignore đã loại
# node_modules/dist khỏi context nên COPY . . không đè bậy.
# bcrypt@6 là native module -> cần toolchain biên dịch ở stage này.
# LƯU Ý: python3 ở đây CHỈ là công cụ build cho node-gyp (trình biên dịch
# của Node.js), KHÔNG phải runtime của app. App vẫn là Node.js + TypeScript +
# Express 100%. python3/make/g++ nằm ở stage build rồi bị bỏ lại, stage
# runtime (dưới) chỉ có node + dist, không hề có Python.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists
RUN pnpm --filter backend exec prisma generate \
 && pnpm --filter backend build
# Vì sao prisma generate ở đây: apps/backend/generated/prisma bị gitignore,
# không COPY được từ host (đối chiếu src/prisma.ts:3-6).
# Vì sao KHÔNG migrate ở đây: lúc build chưa có DB để nối; migrate là việc
# của lúc chạy (xem §5).

# ---- Stage 3: runtime ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app/apps/backend
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/generated ./generated
COPY --from=build /app/apps/backend/package.json ./package.json
# dist/swagger.js đọc ../openapi.yaml lúc boot (src/swagger.ts:8) -> thiếu là crash.
COPY --from=build /app/apps/backend/openapi.yaml ./openapi.yaml
# Giữ prisma/ + config để entrypoint chạy `prisma migrate deploy` lúc start.
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/apps/backend/prisma.config.ts ./prisma.config.ts
# Giữ ĐÚNG đường dẫn /app y như lúc build để symlink pnpm không gãy;
# WORKDIR /app/apps/backend cũng chính là cwd mà dotenv đọc file .env
# (src/app.ts:5, src/prisma.ts:8) khi chạy local bằng file.
# Chỉ mang dist + generated + node_modules prod sang runtime:
# bỏ source .ts, bỏ toolchain, image nhẹ và không lộ code nguồn.
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
# Exec-form để node là PID 1 và nhận SIGTERM -> khớp shutdown() ở server.ts:23.
# Không COPY .env: secret inject qua environment lúc run (app.ts:5 đọc cwd/.env,
# WORKDIR /app/apps/backend chính là cwd đó khi cần file local).
```

Quyết định quan trọng nhất: **không dùng `alpine`**. `bcrypt@6`
(`apps/backend/package.json`) biên dịch native; trên alpine (musl) thường gãy
và tốn thời gian debug. `bookworm-slim` (glibc) + toolchain ở stage build là
lựa chọn ít rủi ro nhất.

---

## 3. Thiết kế `Dockerfile.frontend` — build-time vs run-time

```dockerfile
# ---- Stage 1: build ----
FROM node:20-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_FIREBASE_ENABLED=false
# Mọi biến VITE_* cần cho bundle đều là ARG: bake vào lúc build.
RUN pnpm --filter frontend build

# ---- Stage 2: serve ----
FROM nginx:alpine AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`nginx.conf` tối thiểu (SPA fallback theo `vercel.json` + proxy API về backend
khi chạy cùng Compose):

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  location / { try_files $uri /index.html; }
  location /api/ {
    resolver 127.0.0.11 valid=30s;  # DNS nhúng của Docker (compose network)
    set $api http://api:3000;       # qua biến để nginx BOOT được cả khi chạy
    proxy_pass $api;                # lẻ không có host "api" (lúc đó /api/* 502)
    proxy_set_header Host $host;
  }
}
```
> Bài học thực tế: `proxy_pass http://api:3000` trực tiếp khiến nginx resolve
> host lúc boot — chạy lẻ container là crash `host not found in upstream "api"`.
> Dùng biến + `resolver` thì boot luôn được.

Hai ý tưởng cần nắm:

1. `ARG` (bake lúc `docker build`) khác `ENV` (đọc lúc `docker run`). Toàn bộ
   `VITE_*` thuộc loại 1. Đổi domain API = build lại image frontend, không có
   đường tắt.
2. Frontend không bao giờ giữ secret: `VITE_FIREBASE_*` là public client config
   (đã ghi trong `.env.example`), còn `FIREBASE_PRIVATE_KEY` của backend tuyệt
   đối không được xuất hiện ở image này.

---

## 4. Thiết kế `compose.yml` — mỗi service là một container

```yaml
services:
  db:
    image: mariadb:11            # schema dùng provider mysql + adapter mariadb
    volumes: [db-data:/var/lib/mysql]   # không có dòng này: docker down -v là mất DB
    healthcheck:                 # backend chỉ migrate khi DB healthy
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s / timeout: 5s / retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:                 # secret inject, không bake vào image
      DB_HOST: db                # tên service, không phải localhost
      DB_PORT: 3306
      DB_NAME, DB_USER, DB_PASSWORD, DATABASE_URL, JWT_*, FRONTEND_ORIGIN: ...
      NODE_ENV: development      # local: tránh boot-crash media (§7.3)
    depends_on:
      db: { condition: service_healthy }
    entrypoint: ["sh", "-c", "prisma migrate deploy && node dist/server.js"]
    # Migrate ở entrypoint (lúc chạy, DB đã healthy), không phải lúc build.
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://localhost:3000/health')...\""]

  web:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args: { VITE_API_BASE_URL: http://localhost:3000/api }
    ports: ["8080:80"]
    depends_on: [api]

volumes: { db-data: {} }
```

Đọc sơ đồ này theo đúng khái niệm container (§1 trong trao đổi trước):

```text
Dockerfile.backend -> image backend -> container api (node dist/server.js)
Dockerfile.frontend -> image frontend -> container web (nginx)
mariadb:11 (image có sẵn) -> container db
```

`depends_on healthy` + `healthcheck` là phần hay bị bỏ qua nhất: không có nó,
`api` sẽ `migrate deploy` trong khi `db` chưa nhận kết nối và crash loop.

---

## 5. Ma trận biến môi trường — loại nào đi đâu

| Nhóm | Ví dụ | Đi đâu | Vì sao |
|---|---|---|---|
| Runtime backend | `DB_*, JWT_*, FRONTEND_ORIGIN, PORT` | `environment:` lúc run | Đọc mỗi request/khởi động (`server.ts:8`, `app.ts:10`, `prisma.ts:10`) |
| CLI migrate | `DATABASE_URL` (fallback) | `environment:` lúc run | `prisma.config.ts:6-15` ưu tiên `DB_*`, fallback URL |
| Build-time frontend | `VITE_API_BASE_URL`, `VITE_FIREBASE_*` | `args:` lúc build | Nhúng vào bundle Vite, đổi là build lại |
| Boot-gate prod | `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `PUBLIC_MEDIA_BASE_URL` | `environment:`, bắt buộc khi `NODE_ENV=production` | `validateProductionMediaConfig()` (`media-config.ts:94-96`) throw là crash |
| Không bao giờ vào image | `.env` thật, `AWS_SECRET_*`, `FIREBASE_PRIVATE_KEY` | secret store / env lúc run | Bake vào image = lộ secret trong layer history |

---

## 6. DB trong Docker hay managed — quyết định theo môi trường

- **Dev/test: cho DB vào Compose.** Disposable, `migrate deploy` là có schema
  sạch. Bắt buộc có `volume`, nếu không restart mất hết.
- **Prod hiện tại: giữ managed (Railway/Aiven).** Không thêm service `db` vào
  `compose.prod.yml`, `DB_HOST` trỏ ra ngoài. Lý do: repo **không có seed**
  (`README.md`); DB trắng migrate xong vẫn không login được (thiếu department,
  role/permission, admin). Mất DB prod = dựng lại bằng tay từ dump bàn giao.
- Muốn chuyển DB prod vào Docker sau này: `mysqldump` -> restore vào volume ->
  đổi `DB_HOST=db` -> tự lo backup cron + disk. Không làm trong lần docker hóa
  đầu tiên.

---

## 7. Bảy cái bẫy đã chứng minh từ code (đọc trước khi build)

1. **Quên `prisma generate` trong build** — `generated/prisma` bị gitignore,
   `COPY` từ host được thư mục rỗng, runtime crash ở `prisma.ts:6`.
2. **Thiếu `tsc-alias`** — import `@/...` (`app.ts`, `server.ts`) không resolve
   ở `dist/`, chỉ build `tsc` là chưa đủ.
3. **Boot-crash media ở prod** — `NODE_ENV=production` mà thiếu 1 trong 3 biến
   `AWS_REGION/S3_BUCKET/PUBLIC_MEDIA_BASE_URL` là `server.ts:6` throw trước cả
   `listen`. Local Docker để `NODE_ENV` unset/development.
4. **`.env` sai chỗ** — `app.ts:5` và `prisma.ts:8` đọc `process.cwd()/.env`.
   `WORKDIR` image phải khớp, hoặc bỏ file và inject env.
5. **Trộn `package-lock.json`** — root dùng pnpm (`pnpm-workspace.yaml`,
   `pnpm-lock.yaml`); file `package-lock.json` lẻ dưới `apps/*` bị ignore, build
   phải `pnpm --frozen-lockfile`, không `npm ci`.
6. **`VITE_*` đổi sau build** — vô hiệu, phải build lại image frontend (§3).
7. **CORS + cookie `Secure/SameSite=None`** — prod khác origin bắt buộc HTTPS
   đúng domain (`FRONTEND_ORIGIN` không `/` cuối). Docker không sửa lỗi này,
   nó chỉ làm lỗi lặp lại y hệt ở mọi máy — đó chính là giá trị của Docker.

---

## 8. Lộ trình đề xuất (ít rủi ro nhất)

1. `Dockerfile.backend` + chạy local trỏ DB managed hiện có — verify `/health`,
   login, 1 happy path borrow/return.
2. `compose.yml` dev (db + api + web) — verify `/health`, không kỳ vọng login
   trên DB trắng (chưa có seed).
3. `Dockerfile.frontend` + nginx SPA fallback — verify refresh deep link.
4. `compose.prod.yml` (bỏ service db, giữ managed) + `.dockerignore`
   (`node_modules`, `dist`, `generated`, `.env`, `.git`, `docs`, `training`).
5. CI build/push image (GHCR) + deploy VPS — ngoài phạm vi lần này.

Verify sau mỗi bước: `pnpm --filter backend typecheck`, `build` backend,
`build:frontend`, `GET /health`, `git diff --check`.
