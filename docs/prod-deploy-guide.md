# Hướng dẫn: từ deploy tay sang CI/CD bằng code (Render + Vercel + Aiven)

Dành cho người đang deploy thủ công theo `docs/deployment-guide.md` và giờ muốn
thêm Docker (dev) + GitHub Actions CI + khai báo prod bằng file. Đọc xong là
làm được từng bước.

## 1. `render.yaml` để làm gì?

Hiện tại deploy backend lên Render bạn **nhập tay** trên dashboard: Build
Command, Start Command, từng biến môi trường. Nhược điểm: quên 1 biến là sập,
đổi máy là quên hết, không ai review được.

`render.yaml` (nằm ở root repo) là **cùng thông tin đó nhưng viết thành file**
— Render gọi là Blueprint:

```yaml
buildCommand: pnpm install --frozen-lockfile && pnpm --filter backend exec prisma generate && pnpm --filter backend exec prisma migrate deploy && pnpm --filter backend build
startCommand: pnpm --filter backend start
healthCheckPath: /health
envVars: [DB_HOST, JWT_SECRET, FRONTEND_ORIGIN, AWS_*, ...]  # secret: sync: false
```

- Vào Render → New → **Blueprint** → chọn repo → Render đọc file này và tự tạo
  service đúng y cấu hình. Code đổi → Render tự redeploy.
- Biến nào `sync: false` nghĩa là **giá trị thật nhập tay trên dashboard 1 lần**,
  không commit vào Git (mật khẩu DB, JWT secret...). File chỉ khai *tên biến*.
- Sửa Build Command hay thêm biến mới = sửa file + review PR như code thường.

## 2. Orchestration prod là gì?

*Orchestration* = ai điều phối dàn prod (cái gì chạy ở đâu, nói chuyện sao, chết
thì sao). Ở dev, người điều phối là `docker-compose.yml` (1 file chạy cả
db+api+web). Ở prod của bạn **không có compose** (prod là 3 managed service),
nên mỗi mảnh có 1 "tờ khai" riêng:

| Mảnh prod | Tờ khai | Ai đọc |
|---|---|---|
| Backend trên Render | `render.yaml` (mới tạo) | Render Blueprint |
| Frontend trên Vercel | `apps/frontend/vercel.json` (có sẵn: SPA fallback) + env trên dashboard Vercel | Vercel |
| DB trên Aiven | Không có file — quản trên console Aiven, backup tự động | Con người |

Ba tờ khai này cộng lại chính là orchestration prod của bạn. Không cần
`compose.prod.yml` — nó chỉ có ích khi bạn tự nuôi VPS.

## 3. Toàn cảnh 3 môi trường (đừng lẫn)

```text
DEV (máy bạn):      docker compose up → db local + api + web (code mới nhất)
                         ↓ push
CI (GitHub Actions): typecheck → unit tests → audit → build → docker build thử
                         ↓ xanh mới được merge
PROD:               main → Render tự deploy backend (render.yaml)
                         → Vercel tự deploy frontend
                         → DB Aiven đứng ngoài, không ai đụng
```

Quy tắc: **compose không bao giờ chạm prod**. DB local trong compose là đồ
xài-vứt; DB thật nằm ở Aiven.

## 4. Làm từng bước (từ trạng thái đang deploy tay)

### Bước 1 — Đẩy code CI + Docker + render.yaml lên GitHub

```bash
git add .github/workflows/ci.yml apps/backend/Dockerfile apps/frontend/Dockerfile \
  apps/frontend/nginx.conf docker-compose.yml .dockerignore render.yaml \
  docs/docker-design.md docs/docker-explained.md
git commit -m "chore: add CI, Docker dev setup and Render blueprint"
git push
```

Vào tab **Actions** của repo, xem job `verify` xanh hết (11→12 steps gồm audit).

### Bước 2 — Bật gác cổng PR (để code dởm không lọt lên main)

Repo → Settings → Branches → Add rule cho `main` → bật **Require status checks**
→ chọn `verify`. Từ giờ PR đỏ là không merge được.

### Bước 3 — Nối Render vào Blueprint (làm 1 lần)

1. Render Dashboard → New → **Blueprint** → chọn repo `training_SE`.
2. Render đọc `render.yaml`, tạo service `bigin-backend`.
3. Nhập giá trị thật cho các biến `sync: false` (lấy từ service Render cũ đang
   chạy của bạn — copy sang, đừng bịa mới JWT secret nếu app đang có user
   login, đổi secret là toàn bộ token cũ chết).
4. Deploy → test `https://<mới>.onrender.com/health` → `{"status":"ok"}`.
5. Chỉ khi service mới OK mới trỏ traffic sang (đổi URL ở frontend), rồi xóa
   service cũ. Đừng xóa service cũ trước.

### Bước 4 — Vercel (giữ nguyên, kiểm lại 2 chỗ)

1. Project Vercel vẫn Root `apps/frontend`, build `pnpm build`, output `dist`
   (đã đúng từ đầu).
2. Env `VITE_API_BASE_URL` = URL backend Render **mới** → **redeploy** (biến
   VITE nướng vào bundle, đổi là phải build lại — xem `docs/docker-design.md`).

### Bước 5 — Nối CORS lại

Trên Render service mới sửa `FRONTEND_ORIGIN` = URL Vercel chính xác, không `/`
cuối → Render tự redeploy backend.

### Bước 6 — Verify cuối (theo checklist bàn giao `README.md`)

`/health`, `/swagger`, login → refresh → logout, 1 happy path asset,
borrow/return, issue/repair, upload ảnh (media cần S3/CloudFront thật).

## 5. Checklist biến môi trường prod (đối chiếu khi nhập)

Backend (Render, từ `render.yaml` + `apps/backend/.env.example`):

- DB: `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DATABASE_URL` (Aiven).
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN=15m`, `REFRESH_TOKEN_SECRET`,
  `REFRESH_TOKEN_EXPIRES_IN=7d`.
- App: `DEFAULT_REGISTER_ROLE_NAME` (phải trùng role có sẵn trong DB),
  `FRONTEND_ORIGIN` (URL Vercel, không `/` cuối).
- Media (bắt buộc vì `NODE_ENV=production`): `AWS_REGION`,
  `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `PUBLIC_MEDIA_BASE_URL`.

Frontend (Vercel): `VITE_API_BASE_URL=https://<backend>.onrender.com/api`
(+ chùm `VITE_FIREBASE_*` nếu đã bật push).

## 6. Rollback khi deploy lỗi

- **Render:** service → Manual Deploy → chọn commit cũ xanh CI → deploy.
  Vì migrate Prisma đi tới (forward-only), rollback code không rollback schema —
  migration lỗi mới đáng sợ, code lỗi thì deploy bản cũ là xong.
- **Vercel:** Deployments → chọn bản cũ → Redeploy.
- **Không bao giờ** rollback bằng cách sửa tay trên dashboard rồi quên cập nhật
  file — lệch file và thực tế là nguồn gốc mọi sự cố deploy sau này.

## 7. Câu hỏi hay gặp

- *Compose dev có ảnh hưởng prod không?* Không. Nó chỉ nói chuyện với DB local
  trong máy bạn.
- *Đổi code có cần build Docker lại không?* Dev local bằng compose: có
  (`--build` lại service đó). Deploy prod Render/Vercel: không đụng Docker,
  platform tự build.
- *Thêm API mới thì sao?* Vẫn theo `AGENTS.md`: update `apps/backend/openapi.yaml`
  + `docs/contracts/api-catalog.md` cùng task, CI không check hộ cái này.
