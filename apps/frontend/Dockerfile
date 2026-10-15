# BigIn frontend image (Vue 3 + Vite -> nginx static).
#
# Dockerfile nằm trong apps/frontend/ nhưng BUILD TỪ ROOT:
#   docker build -f apps/frontend/Dockerfile -t bigin-frontend .
#
# Lưu ý quan trọng: mọi biến VITE_* (VITE_API_BASE_URL, VITE_FIREBASE_*)
# được Vite "nướng" vào bundle LÚC BUILD -> truyền bằng --build-arg,
# đổi URL sau build = build lại image (xem docs/docker-design.md §3).

# ---- Stage 1: deps ----
FROM node:20-bookworm-slim AS deps
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
# Install FULL workspace (không --filter): giữ symlink pnpm nguyên vẹn cho vite.
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build ----
FROM node:20-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app
# Cùng lưới an toàn như backend: COPY source trước, xóa sạch node_modules
# (kể cả khi lọt của host vào), rồi copy cây chuẩn từ stage deps đè lên.
COPY . .
RUN rm -rf node_modules apps/frontend/node_modules apps/backend/node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
ARG VITE_API_BASE_URL=http://localhost:3000/api
ARG VITE_FIREBASE_ENABLED=false
RUN pnpm --filter frontend build

# ---- Stage 3: serve (nginx, không cần Node) ----
FROM nginx:alpine AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
