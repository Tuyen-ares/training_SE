# BigIn backend image (Express 5 + TypeScript + Prisma + MariaDB).
#
# Dockerfile nằm trong apps/backend/ nhưng BUILD TỪ ROOT:
#   docker build -f apps/backend/Dockerfile -t bigin-backend .
# Lý do: backend thuộc pnpm workspace (pnpm-workspace.yaml: apps/*) nên lúc
# install cần thấy root lockfile + cả 2 package.json.
#
# Runtime khớp code hiện tại:
# - CMD node dist/server.js  (apps/backend/package.json:start)
# - PORT đọc từ env, default 3000 (src/server.ts:8)
# - Health probe GET /health (src/app.ts:34)
# - .env đọc ở process.cwd() (src/app.ts:5, src/prisma.ts:8) -> WORKDIR runtime
#   giữ đúng đường dẫn /app/apps/backend như lúc build để pnpm symlink
#   (node_modules) không gãy.

# ---- Stage 1: deps (tận dụng layer cache) ----
FROM node:20-bookworm-slim AS deps
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
# Install FULL workspace (không --filter): pnpm dựng symlink giữa
# apps/backend/node_modules và root .pnpm-store, thiếu 1 mảnh là gãy binary
# (đã gãy thật ở lần build đầu: prisma MODULE_NOT_FOUND).
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build ----
FROM node:20-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
# Thứ tự này là cố ý để miễn nhiễm với context bẩn:
# 1. COPY . . (kể cả khi lọt node_modules của host vào),
# 2. rm xóa SẠCH mọi node_modules (lúc này stage build chưa có cây "tốt" nào),
# 3. copy cây đã install chuẩn từ stage deps đè lên.
COPY . .
RUN rm -rf node_modules apps/backend/node_modules apps/frontend/node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
# bcrypt@6 là native module: node-gyp cần python3 + compiler.
# Đây CHỈ là đồ nghề build (app vẫn là Node.js thuần), bị bỏ lại ở stage này.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists
# generated/prisma bị gitignore nên BẮT BUỘC generate trong build (src/prisma.ts:6).
# KHÔNG migrate ở đây: lúc build chưa có DB (migrate chạy lúc container start).
RUN pnpm --filter backend exec prisma generate \
 && pnpm --filter backend build

# ---- Stage 3: runtime (nhẹ, không source .ts, không toolchain) ----
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
# Không COPY .env: secret inject qua environment lúc chạy.
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
# Exec-form để node là PID 1, nhận SIGTERM -> graceful shutdown (src/server.ts:23).
CMD ["node", "dist/server.js"]
