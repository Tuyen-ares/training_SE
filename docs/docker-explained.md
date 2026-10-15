# Giải thích từng cấu hình Docker — kèm code thật trong repo

Tài liệu này trả lời cho từng dòng trong 5 file Docker: **dòng này là gì, vì
sao có nó, bỏ nó thì sao**. Viết cho newbie, đọc từ trên xuống dưới là hiểu
hết. Muốn hiểu sâu thiết kế tổng thể thì đọc thêm `docs/docker-design.md`.

5 file:

| File | Việc |
|---|---|
| `.dockerignore` (root) | Chặn rác/secret lọt vào lúc build |
| `apps/backend/Dockerfile` | Đóng gói backend Express thành image |
| `apps/frontend/Dockerfile` | Đóng gói frontend Vue thành image |
| `apps/frontend/nginx.conf` | Cấu hình nginx serve web trong image frontend |
| `docker-compose.yml` (root) | Điều phối cả dàn db + api + web |

---

## 1. `.dockerignore` — "danh sách đen lúc build"

**Vì sao có:** mỗi lần `docker build`, Docker copy toàn bộ thư mục root vào để
làm nguyên liệu (gọi là *build context*). Không chặn thì nó vác cả
`node_modules` 5GB + `.env` chứa mật khẩu vào. File này bảo "mấy thứ này khỏi
copy".

```text
node_modules/        # Thư mục thư viện 5GB ở máy bạn. Image tự cài lại
**/node_modules/     # Dòng trên đôi khi không chặn được thư mục lồng nhau
                     # (đã gây lỗi thật: prisma MODULE_NOT_FOUND), nên chặn
                     # thêm kiểu này cho chắc
dist/                # Code đã build cũ ở máy bạn, image tự build mới
generated/           # Prisma client cũ, image tự generate mới
.env                 # Mật khẩu THẬT, cấm lọt vào image (ai có image là đọc được)
.env.*               # .env.development, .env.production... cũng cấm
!.env.example         # Dấu ! nghĩa là NGOẠI LỆ: file mẫu (không secret) được giữ
.git/                # Lịch sử Git mấy chục MB, image không cần
training/ docs/ tooling/ _workspace/ .tmp/
                     # Tài liệu/code học tập, không liên quan runtime
*.log                # File log rác
```

**Bỏ dòng `.env` thì sao:** secret khắc vào lịch sử image, ai pull image là thấy
mật khẩu DB. Đây là lỗi bảo mật thật, không phải lý thuyết.

---

## 2. `apps/backend/Dockerfile` — giải thích từng khối

> Build từ root: `docker build -f apps/backend/Dockerfile -t bigin-backend .`
> Dockerfile nằm cạnh code nhưng nguyên liệu (lockfile workspace) nằm ở root.

### Stage 1 — `deps`: cài thư viện 1 lần, dùng nhiều lần

```dockerfile
FROM node:20-bookworm-slim AS deps
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN pnpm install --frozen-lockfile
```

- `FROM node:20-bookworm-slim`: xin 1 cái máy Linux mini có sẵn Node 20.
  `bookworm-slim` (Debian gọn) thay vì `alpine` vì `bcrypt` biên dịch native
  trên alpine hay gãy. Version 20 khớp `README.md` yêu cầu.
- `corepack ... pnpm@10.32.1`: bật đúng version pnpm mà repo pin, khỏi lệch.
- `WORKDIR /app`: từ đây mọi lệnh chạy trong `/app` (như `cd /app`).
- 3 dòng `COPY` lockfile + package.json **trước**: Docker chụp ảnh từng bước
  (layer). Đổi code không đổi lockfile → bước install dùng lại ảnh cũ, build
  nhanh (30s thay vì 5 phút).
- `install FULL không --filter`: pnpm nối `apps/backend/node_modules` với kho
  root bằng symlink. Install thiếu là gãy binary (đã gãy thật ở lần build đầu).
- `--frozen-lockfile`: cấm tự đổi version thư viện lúc build, build nào cũng
  giống build nào.

### Stage 2 — `build`: biên dịch + lưới an toàn `rm`

```dockerfile
FROM node:20-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY . .
RUN rm -rf node_modules apps/backend/node_modules apps/frontend/node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists
RUN pnpm --filter backend exec prisma generate \
 && pnpm --filter backend build
```

- `COPY . .` trước: lấy source code vào.
- `RUN rm -rf ...` là **lưới an toàn** cho lỗi đã gặp thật: nếu `node_modules`
  Windows của máy bạn lọt vào (symlink Windows sang Linux là gãy), xóa sạch
  rồi lấy cây chuẩn từ stage `deps` đè lên. Lúc này stage chưa có cây "tốt"
  nào nên `rm` không mất gì.
- `COPY --from=deps`: gắp cây thư viện đã cài chuẩn từ stage 1 sang (symlink
  pnpm giữ nguyên vì giữ đúng đường dẫn `/app`).
- `python3 make g++`: đồ nghề cho `node-gyp` biên dịch `bcrypt` (C++).
  **Không phải app Python** — app vẫn Node thuần, đồ nghề bỏ lại ở stage này.
- `prisma generate`: `generated/prisma` bị gitignore nên bắt buộc sinh trong
  build (`src/prisma.ts` require nó lúc chạy).
- `pnpm build` = `tsc + tsc-alias` ra `dist/`. **Không `migrate` ở đây** vì lúc
  build chưa có DB để nối — migrate chạy lúc container start (xem compose).

### Stage 3 — `runtime`: image giao đi (nhẹ, không source, không đồ nghề)

```dockerfile
FROM node:20-bookworm-slim AS runtime
WORKDIR /app/apps/backend
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/generated ./generated
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/apps/backend/openapi.yaml ./openapi.yaml
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/apps/backend/prisma.config.ts ./prisma.config.ts
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
```

- Giữ đúng đường dẫn `/app` như lúc build để symlink pnpm không gãy, đồng thời
  `/app/apps/backend` chính là `process.cwd()` mà `dotenv` đọc file `.env`
  (`src/app.ts:5`, `src/prisma.ts:8`).
- `openapi.yaml`: `dist/swagger.js` đọc file này lúc boot (`src/swagger.ts:8`),
  thiếu là crash `ENOENT` (đã crash thật 1 lần).
- `prisma/ + prisma.config.ts`: để entrypoint chạy `migrate deploy` lúc start.
- **Không COPY `.env`**: secret đưa vào lúc chạy, không khắc vào image.
- `EXPOSE 3000`: khai báo "container này nghe cổng 3000" (tài liệu, không tự
  mở cổng — mở cổng nằm ở compose `ports`).
- `HEALTHCHECK`: Docker tự hỏi `GET /health` mỗi 30s, 3 lần fail thì đánh dấu
  container `unhealthy`. Dùng `process.env.PORT||3000` cho đúng mọi môi trường.
- `CMD ["node", "dist/server.js"]` dạng exec (không qua shell) để node là PID 1,
  nhận được `SIGTERM` khi dừng → graceful shutdown (`src/server.ts:23`).

---

## 3. `apps/frontend/Dockerfile` — 2 ý mới so với backend

Cấu trúc stage y hệt backend (deps → build + lưới `rm` → serve), chỉ khác:

```dockerfile
ARG VITE_API_BASE_URL=http://localhost:3000/api
ARG VITE_FIREBASE_ENABLED=false
RUN pnpm --filter frontend build
```

- `ARG` = nguyên liệu đưa vào **lúc build** (`--build-arg`). Vite "nướng"
  `VITE_*` thẳng vào file JS nên đổi URL sau build là vô hiệu — phải build lại
  image. Đây là điểm khác backend (backend đọc `ENV` lúc chạy).
- Stage cuối là `nginx:alpine`, không phải node:

```dockerfile
FROM nginx:alpine AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- Chỉ gắp `dist/` (web tĩnh) sang, bỏ Node luôn — serve file tĩnh không cần Node.
- `nginx.conf` đè lên config mặc định của nginx.

---

## 4. `apps/frontend/nginx.conf` — từng dòng

```nginx
server {
  listen 80;                        # Nghe cổng 80 trong container
  root /usr/share/nginx/html;       # File web nằm ở đây (dist/ đã copy sang)

  location / {
    try_files $uri /index.html;     # Có file thì trả file, không có thì trả
  }                                 # index.html (SPA fallback theo vercel.json:
                                    # refresh /assets/:id không 404)

  location /api/ {
    resolver 127.0.0.11 valid=30s;  # DNS nhúng của Docker (chỉ có trong compose)
    set $api http://api:3000;       # Gán host backend vào BIẾN...
    proxy_pass $api;                # ...để nginx KHÔNG resolve lúc boot.
    proxy_set_header Host $host;    # Giữ nguyên Host cho backend check CORS
  }
}
```

- Vì sao `proxy_pass` qua biến: ghi thẳng `http://api:3000` thì nginx resolve
  host lúc boot — chạy lẻ không có host `api` là crash `host not found`
  (đã crash thật). Qua biến thì boot luôn được, chỉ `/api/*` trả 502 khi chạy lẻ.

---

## 5. `docker-compose.yml` — từng khối

```yaml
services:
  db:                               # 1 container MariaDB cho dev
    image: mariadb:11               # Image có sẵn, khỏi viết Dockerfile
    environment:                    # User/pass DUMMY cho DB local xài-vứt
      MARIADB_ROOT_PASSWORD: root
      MARIADB_DATABASE: bigin
      MARIADB_USER: bigin
      MARIADB_PASSWORD: bigin
    volumes:
      - db-data:/var/lib/mysql      # Sổ cứng giữ data ngoài container.
                                    # down thường thì còn, down -v thì mất
    healthcheck:                    # Hỏi DB "tỉnh chưa" mỗi 10s...
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
```

```yaml
  api:                              # 1 container backend
    build: { context: ., dockerfile: apps/backend/Dockerfile }
    ports: ["3000:3000"]            # "máy bạn:container" — mở cổng ra ngoài
    environment:
      DB_HOST: db                   # Tên service db, KHÔNG phải localhost
                                    # (localhost trong container là chính nó)
      DB_PORT: 3306
      DB_NAME/DB_USER/DB_PASSWORD:  # Khớp với MARIADB_* ở trên
      FRONTEND_ORIGIN: http://localhost:8080  # Browser mở web ở cổng này,
                                    # phải khớp CORS (src/app.ts)
      NODE_ENV: ""                  # Rỗng = development, tránh boot-crash
                                    # thiếu media config prod
    entrypoint: ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/server.js"]
                                    # Mỗi lần start: nâng DB lên schema mới
                                    # nhất RỒI mới chạy app. exec giữ PID 1
    depends_on:
      db: { condition: service_healthy }  # Đợi db healthy mới start (đã healthy
                                    # mới migrate được, không crash loop)
    healthcheck:                    # Tự kiểm /health mỗi 30s
```

```yaml
  web:                              # 1 container frontend
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      args:
        VITE_API_BASE_URL: http://localhost:3000/api
                                    # Browser gọi API TRỰC TIẾP nên dùng
                                    # localhost:3000, không phải tên nội bộ
    ports: ["8080:80"]
    depends_on: [api]               # Web start sau api (không cần healthy)

volumes:
  db-data:                          # Khai báo "cuốn sổ" dùng chung
```

---

## 6. Bảng tra nhanh: muốn đổi X thì sửa đâu?

| Muốn đổi | Sửa ở đâu | Có phải build lại? |
|---|---|---|
| Mật khẩu DB local | `docker-compose.yml` (2 chỗ `environment`) | Không, `up` lại là xong |
| Port web 8080 | `docker-compose.yml` ports của `web` | Không |
| URL API frontend dùng | `docker-compose.yml` args `VITE_API_BASE_URL` | **Có** (nướng vào bundle) |
| Version Node/pnpm | Dòng `FROM` + `corepack` trong cả 2 Dockerfile | Có |
| Thêm thư viện backend | `apps/backend/package.json` | Có (lockfile đổi → install lại) |
| Thêm biến secret mới | `environment` của service, không bake vào image | Không |
| Dùng MySQL thật thay db local | Xóa service `db`, sửa `DB_HOST` (xem `docs/docker-design.md` §6) | Không |
