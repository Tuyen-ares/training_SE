# Audit lưu trữ dữ liệu và hiệu năng

**Ngày audit:** 2026-08-11  
**Phạm vi:** mã nguồn hiện tại trong `apps/backend`, `apps/frontend`, Prisma schema,
cấu hình runtime và production frontend build. Đây là static audit; không có quyền
truy cập endpoint Render hay database production nên chưa có số p50/p95 thực tế hoặc
`EXPLAIN` trên dữ liệu thật.

## Kết luận ngắn

Backend đang phù hợp với MVP nhỏ: một `PrismaClient` được tạo một lần, dữ liệu nghiệp
vụ có nguồn sự thật trong MariaDB/MySQL, access token không được lưu persistent ở
browser, và phần lớn danh sách nghiệp vụ đã phân trang.

Điểm nghẽn quan trọng khi chạy Render Free 0.1 CPU không phải một memory cache bị
quá tải, vì hiện **không có application cache**. Rủi ro chính là số lần gọi API/DB
không cần thiết, vài danh sách lấy toàn bộ rồi lọc ở client, các index thiếu cho
filter/sort phổ biến, và bundle frontend đầu vào lớn.

Ưu tiên đề xuất:

1. Đo latency theo route và slow query trước, tách cold start khỏi latency bình thường.
2. Thay Dashboard bằng API summary một lần gọi; phân trang/lọc ở server cho Users;
   dùng endpoint current history cho Handover & Return.
3. Xác nhận bằng `EXPLAIN ANALYZE` rồi thêm index có mục tiêu.
4. Giảm vendor bundle Ant Design Vue và cache dữ liệu tra cứu ít thay đổi ở client.
5. Đưa notification fan-out ra sau transaction và quản lý retention cho token/notification.

## 1. Bản đồ nơi dữ liệu đang sống

| Vị trí | Dữ liệu hiện có | Vòng đời | Nhận xét / chính sách đề xuất |
| --- | --- | --- | --- |
| Browser RAM (Pinia) | `accessToken`, `user`, `initialized`, `refreshPromise` trong `stores/auth.js` | Mất khi reload/đóng tab | Đúng cho access token. Không chuyển access token hay hồ sơ user sang `localStorage`. |
| Browser persistent | `theme` trong `localStorage`; cookie `refreshToken` HttpOnly/Secure ở production | Theme lâu dài; refresh token đến hạn 7 ngày | Theme là dữ liệu vô hại. Cookie không đọc được bởi JavaScript là đúng. Không có `sessionStorage`/IndexedDB/application cache hiện tại. |
| Browser RAM theo màn hình | Kết quả list/detail, form, filter, dialog, loading/error state bằng `ref`/`reactive` | Mất khi rời màn hình | Bình thường; nhưng `Users.vue`, Handover/Return và tạo Borrow Request đang giữ tập dữ liệu lớn hơn cần thiết. |
| Node/Express RAM | Module code, CORS `Set`, Swagger spec parse lúc boot, formatter ngày, request/response tạm thời | Mất khi Render restart/spin down | Không có Map/Redis/cache/queue giữ dữ liệu nghiệp vụ. Không được dùng RAM làm nguồn sự thật. |
| Node database client | Một `PrismaClient` + MariaDB adapter từ `src/prisma.ts` | Suốt process | Đây là singleton tốt. Cấu hình pool đang implicit; đo mức chờ connection trước khi thay đổi pool. |
| MariaDB/MySQL | Toàn bộ dữ liệu bền vững bên dưới | Bền vững theo database provider | Là nguồn sự thật. Nhóm bảng chi tiết ở phần dưới. |
| Bên ngoài | `avatar_url`, `image_url` chỉ là URL; browser tải ảnh trực tiếp từ host URL | Phụ thuộc host ảnh | Không có file/blob/upload cục bộ. Ảnh chậm là network của client, không phải dữ liệu trong backend. |
| Filesystem Render | Không có dữ liệu runtime được application ghi nhận | Ephemeral | Tuyệt đối không thêm SQLite, upload hay cache cần bền vững vào filesystem. Free Web Service mất file khi restart/redeploy/spin down. [Render Free docs](https://render.com/docs/free) |

### Dữ liệu bền vững trong database

| Nhóm | Bảng | Mục đích |
| --- | --- | --- |
| Identity/session | `users`, `registration_requests`, `refresh_tokens`, `user_code_sequences` | Tài khoản, yêu cầu đăng ký, refresh-token rotation và sequence mã user. `password`/`password_hash` chỉ là hash. |
| RBAC | `roles`, `permissions`, `user_roles`, `role_permissions` | Quyền hiệu lực của user. Permission được đưa vào access token khi login/refresh. |
| Master data | `departments`, `brands`, `asset_types`, `asset_models` | Dữ liệu tra cứu cho asset/user. |
| Nghiệp vụ chính | `assets`, `borrow_requests`, `borrow_request_details`, `borrow_histories`, `asset_issues`, `notifications` | Asset, vòng đời mượn/trả, sự cố/sửa chữa và notification in-app. |

### Luồng session hiện tại

```text
MariaDB refresh_tokens ──> HttpOnly refreshToken cookie ──> POST /auth/refresh
                                                          └─> Browser RAM: accessToken + user + permissions
Browser RAM accessToken ── Authorization header ──> requireAuth (JWT verify) ──> req.auth tạm thời
```

Mỗi protected API không đọc RBAC database: `requireAuth` xác minh JWT và
`requirePermission` đọc `req.auth.permissionCodes`. Login/refresh mới đọc user,
roles và permissions từ database. Điều này tốt cho read path, nhưng thay quyền sẽ có
độ trễ tối đa bằng access-token lifetime cho token đã cấp; không thêm cache RBAC ở RAM
mà không có cơ chế invalidation.

## 2. Điểm tải hiện tại theo luồng

| Luồng / endpoint nhóm | Bằng chứng hiện tại | Tác động khi dữ liệu/tải tăng | Ưu tiên |
| --- | --- | --- | --- |
| Dashboard | `Dashboard.vue` gọi 5 lần `GET /assets?pageSize=1` để lấy total theo status. Nếu đủ quyền personal, gọi thêm tối đa 4 API; `WorkspaceLayout` gọi thêm unread-count. Sau refresh lần đầu, một dashboard đầy đủ có thể tạo 11 HTTP requests. | Mỗi asset count còn đi cùng truy vấn list/join và không có index `assets.status`; 0.1 CPU/DB connection phải xử lý burst đồng thời. | P0 |
| User directory | `GET /users?status=all` trả toàn bộ user + department + roles; `Users.vue` search/filter/pagination trong browser. `users.is_active` không có index. | Response, heap browser và render table tăng tuyến tính theo số user; database không thể lọc/search hiệu quả. | P0 |
| Handover & Return | `HandoverReturnView.vue` gọi `GET /borrow-histories?pageSize=100` rồi `filter(!returnedAt)` ở client, dù API có `/borrow-histories/current`. | Tải lịch sử đã trả không cần thiết; còn có thể bỏ sót asset current nếu 100 record mới nhất đều đã trả. | P0 |
| Chọn asset cho Borrow Request | `BorrowRequestCreateView.vue` tải 100 asset AVAILABLE rồi tìm trong client. | Chậm và không đủ dữ liệu khi có hơn 100 asset available. | P1 |
| Asset list/search | Có phân trang (tốt), nhưng `contains` trên QR/serial/model và sort `created_at,id`; schema không có index status+sort. | `%q%` không dùng B-tree, các filter/sort sẽ scan/sort khi bảng lớn. QR exact lookup đã có unique index. | P1 |
| Review/history/issue lists | Có page size tối đa 100 và count (tốt), nhưng thiếu index cho `approval_status`, `return_date`, issue `status` + sort. | Join + offset lớn + sort có thể trở thành slow query. | P1 |
| Notifications | List query làm list + total count + unread count. Mỗi màn hình tạo lại `WorkspaceLayout` lại gọi unread-count. Một số workflow tạo từng notification bằng `Promise.all` trong Prisma transaction. | Count bị lặp; notification fan-out giữ transaction/connection lâu và số insert tăng theo số recipient. | P1 |
| Asset catalog/lookups/RBAC | Brands/types/models/departments/roles/permissions không phân trang và nhiều form gọi lại. | Hiện hợp lý nếu master data nhỏ; nên client-cache có invalidation, không cần Redis. | P2 |
| Login/register/user create | bcrypt 10 rounds chạy qua worker pool; tạo registration/user có hashing. | Đúng về security nhưng 0.1 CPU dễ tăng latency khi có nhiều login/register đồng thời. Không giảm salt rounds chỉ để nhanh hơn. | P2 |
| Approve All | Xử lý tuần tự từng detail với transaction riêng để giữ partial success và chống race. | Latency tăng tuyến tính với số detail. Không song song hoá mù quáng vì có thể phá business rule/cạnh tranh reserve asset. Thêm giới hạn số item trước. | P2 |

## 3. Bằng chứng từ production build frontend

Lệnh `pnpm build:frontend` đã pass ngày audit, nhưng Vite cảnh báo chunk lớn hơn 500 KB:

| Asset | Kích thước minified | Gzip |
| --- | ---: | ---: |
| `dist/assets/index-*.js` (initial shared bundle) | 1,480.89 KB | 456.76 KB |
| `dist/assets/runtime-core.esm-bundler-*.js` | 63.57 KB | 24.96 KB |
| `WorkspaceLayout` chunk | 23.94 KB | 7.44 KB |

Routes đã dùng `() => import(...)`, nên lazy route hoạt động. Bundle đầu vào vẫn lớn vì
`main.js` dùng `app.use(Antd)`, làm shared vendor bundle chứa phần lớn Ant Design Vue.

**Cách tối ưu:** chuyển sang import component/directive Ant Design Vue theo nhu cầu (hoặc
resolver auto-import có tree-shaking đã kiểm chứng), giữ route lazy-load, rồi build lại và
đặt budget, ví dụ initial JS gzip dưới 250 KB. Không chỉ cấu hình `manualChunks`: tách file
không giảm byte download nếu tất cả vẫn cần ở initial route.

Nếu frontend hiện đang chạy chung Web Service thì chuyển nó sang Render Static Site/CDN;
nếu đã là static deployment thì chỉ xác nhận cache/CDN và không thay đổi kiến trúc. Render
mô tả Static Site là lựa chọn cho Vue và phục vụ qua global CDN. [Render service types](https://render.com/docs/service-types)

## 4. Chỉ mục database cần kiểm chứng

Đây là **candidate index**, không chạy migration ngay. Trên database staging có volume gần
production, chạy `EXPLAIN ANALYZE` cho query thật trước và sau migration. Chỉ giữ index
có dùng thực tế, vì mỗi index làm write chậm hơn và tốn RAM/disk.

| Query phổ biến | Index có trong schema | Candidate cần đánh giá |
| --- | --- | --- |
| Asset dashboard/list theo status, sort `created_at DESC, id DESC` | `asset_model_id`, `department_id`, QR/serial unique | `assets(status, created_at, id)` |
| Asset list theo department, sort mới nhất | `department_id` | `assets(department_id, created_at, id)`; nếu status+department là filter chính, thử một composite theo workload thay vì thêm mọi tổ hợp |
| Users theo active, sort `id DESC` | `department_id`, email/phone unique | `users(is_active, id)` sau khi chuyển filter/paging về server |
| My borrow requests theo user/status, sort mới nhất | `borrow_requests(user_id)` | `borrow_requests(user_id, created_at, id)` và chỉ thêm variant có `status` nếu EXPLAIN cho thấy cần |
| Review Queue filter detail approval status | unique `(borrow_request_id, asset_id)` | `borrow_request_details(approval_status, borrow_request_id)` |
| Current/returned history, sort borrow date | unique `borrow_request_detail_id`, FK indexes | `borrow_histories(return_date, borrow_date, id)` |
| Asset issues filter status/asset, sort created | single FK indexes | `asset_issues(status, created_at, id)` và/hoặc `asset_issues(asset_id, created_at, id)` theo endpoint hot |
| Notification list: recipient + optional isRead + newest first | `(recipient_user_id,is_read)`, `(recipient_user_id,created_at)` | `notifications(recipient_user_id, is_read, created_at, id)` nếu unread tab/list là hot |
| Registration list | `(status,created_at)` | Đủ cho status/sort. Search `contains` name/email/phone vẫn scan; chỉ thay bằng prefix/full-text khi telemetry chứng minh cần. |

Không dùng B-tree để cố tối ưu `contains('%term%')`. Với Asset search, ưu tiên tách QR/serial
exact lookup (đã có unique index) khỏi free-text; giới hạn tối thiểu ký tự hoặc dùng prefix
search. Full-text index chỉ là lựa chọn sau khi có yêu cầu search rõ ràng và benchmark trên
MariaDB thực tế.

## 5. Phân chia dữ liệu và cache đề xuất

| Loại dữ liệu | Nơi giữ khuyến nghị | TTL/invalidation | Không nên làm |
| --- | --- | --- | --- |
| Access token, user hiện tại | Browser RAM như hiện tại | mất khi reload; refresh bằng HttpOnly cookie | Không để token trong `localStorage`/IndexedDB. |
| Theme/UI preference | `localStorage` | lâu dài | Không lưu PII hay kết quả nghiệp vụ lớn. |
| Brand/type/model/department, role option, permission option | Pinia client cache theo tab/session | TTL ngắn 5–15 phút; invalidate ngay sau create/update catalog/role | Không fetch lại 3–4 endpoint trên mọi form; không coi cache là source of truth. |
| Dashboard counters | Một endpoint summary; client cache 10–30 giây hoặc invalidate sau mutation asset/borrow | short-lived, theo user permission | Không dùng 5 query list/count song song để tính counter. |
| Asset/user/borrow/history/issue/notification list | Database + server-side pagination/filter | response chỉ giữ page đang xem | Không tải all rồi filter/page trên client. |
| Images/avatars | Object storage/CDN hoặc host ảnh hiện có; DB chỉ giữ URL | CDN headers tại host ảnh | Không proxy byte ảnh qua Express 0.1 CPU trừ khi có yêu cầu bảo mật/resize. |
| Refresh tokens | Database | purge theo expiry/revocation theo batch ngoài request hot | Không giữ token/session trong RAM; Render restart sẽ mất. |
| Notifications đã đọc | Database, theo retention policy | đề xuất archive/delete sau khi business chốt thời hạn (ví dụ 90/180 ngày) | Không tự xoá nếu chưa có yêu cầu audit/retention. |

Không khuyến nghị Redis/KV ngay. Render Free Key Value là in-memory và mất dữ liệu khi restart,
nên không phù hợp làm session, queue, outbox hay nguồn sự thật. Chỉ cân nhắc cache ngoài khi
telemetry cho thấy database vẫn là bottleneck sau các tối ưu P0/P1. [Render Free docs](https://render.com/docs/free)

## 6. Tối ưu API/application theo thứ tự thực hiện

### P0 — giảm công việc ngay trên hot path

1. **Thêm observability trước khi sửa logic** theo phần 7. Ghi baseline 3–7 ngày.
2. **Thêm dashboard summary API** với một query aggregate/group-by theo status và các
   personal counters cần thiết. Trả đúng các counters UI cần; không trả asset rows.
3. **Thay `/users?status=all`** bằng server-side `page`, `q`, `departmentId`, `roleId`,
   `isActive`; response chỉ select field dùng trong table. Giữ UI pagination là server pagination.
4. **Sửa Handover & Return** dùng `/borrow-histories/current` (hoặc endpoint manager-current
   rõ permission) và phân trang. Không tải history đã returned rồi lọc.
5. **Tách cold start ra khỏi API regression.** Free service spin down sau 15 phút idle;
   lần gọi đầu có thể mất khoảng một phút. Đây không phải query chậm; UX nên hiện trạng thái
   waking/retry thay vì ping giữ service sống. [Render Free docs](https://render.com/docs/free)

### P1 — database và workflow

1. Chạy `EXPLAIN ANALYZE`, chọn candidate index ở phần 4, thêm Prisma migration nhỏ và đo lại.
2. Đổi asset picker thành remote search/paginated endpoint chỉ trả asset AVAILABLE tối thiểu
   (id, model, serial, QR, image). Đặt max `items` cho request tạo Borrow Request theo một
   ngưỡng nghiệp vụ được chốt; hiện schema chỉ `.min(1)`.
3. Gộp notification fan-out thành `createMany`/batch, hoặc tốt hơn theo kiến trúc dự án:
   thu event trong transaction và publish sau commit bằng `Promise.allSettled`. Hiện
   `AssetIssueService.report` và vài action Borrow tạo/query notification trong interactive
   transaction, làm connection/lock sống lâu theo số recipient.
4. Dùng thông báo đã có trong response `GET /notifications` để cập nhật badge; tránh gọi
   `GET /notifications/unread-count` lại mỗi lần `WorkspaceLayout` remount.
5. Cấu hình pool database có giới hạn nhỏ, phù hợp instance và database, **sau khi** đo
   connection wait/CPU. Tăng pool không làm 0.1 CPU nhanh hơn và có thể làm database overload.

### P2 — giảm byte và chi phí nền

1. Tree-shake Ant Design Vue, đặt bundle budget và theo dõi gzip build artifact.
2. Client-cache catalog/role/permission lookup với invalidation khi mutation thành công.
3. Tạo job/scheduler ngoài web process để batch-delete refresh token đã expire/revoked; không
   chạy full-table delete trên request login. Render Free không hỗ trợ one-off jobs và có thể
   restart service, nên không dựa vào `setInterval` trong web process. [Render Free docs](https://render.com/docs/free)
4. Đánh giá `src/database.js` sau khi xác nhận deploy: mã này tạo mysql2 connection nhưng
   không được import trong `src`; runtime đang dùng Prisma. Có thể xoá như cleanup riêng để
   tránh nhầm lẫn/accidental connection, không phải tối ưu P0.
5. Bcrypt 10 rounds giữ nguyên. Nếu auth là hot path do abuse, rate-limit login/register và
   đo queue CPU trước; không giảm cost factor.

## 7. Cách phát hiện API hoặc màn hình chậm

### 7.1 Thiết lập số đo tối thiểu trong backend

Thêm middleware timing cho mọi `/api/*`, log JSON một dòng khi response `finish`. Không log
body, `Authorization`, cookie, email, token hay Prisma parameters.

```json
{
  "event": "http_request",
  "method": "GET",
  "route": "/api/assets",
  "status": 200,
  "duration_ms": 183,
  "response_bytes": 4281,
  "request_id": "..."
}
```

Tách `route` đã chuẩn hoá (`/assets/:id`) khỏi raw URL để không tạo metric cardinality cao và
không lưu query có thể chứa PII. Nếu thêm Prisma query event, chỉ log/summarize query chậm
(ban đầu >=250 ms), duration, operation/model đã chuẩn hoá và `request_id`; **không log
`params`**. Có thể bổ sung `Server-Timing` để DevTools thấy tổng application/DB time.

### 7.2 Quy trình chẩn đoán một màn hình chậm

1. Mở Chrome DevTools → Network, bật Disable cache, reload một lần khi backend warm.
   Ghi số request, transfer size, `Waiting (TTFB)` và tổng duration của từng API.
2. Lặp lại sau 15+ phút không có traffic và ghi riêng là `cold_start`. Không đưa giá trị này
   vào p95 hot API.
3. Nếu TTFB cao, tìm `request_id` trong structured log, so sánh `duration_ms` application với
   slow-query duration. Nếu app nhanh nhưng browser chậm, xem transfer size, bundle và ảnh.
4. Nếu DB slow, copy **query shape không có dữ liệu nhạy cảm** sang staging và chạy
   `EXPLAIN ANALYZE`; chỉ sau đó sửa select/index/query.
5. So sánh before/after cùng volume: p50, p95, p99, error rate, CPU, memory, DB connection
   wait, rows examined và response bytes. Không kết luận từ một request đơn lẻ.

### 7.3 Dashboard Render

Theo dõi CPU/memory, request volume và Response Times (p50/p75/p90/p99) trong Render Metrics,
rồi đối chiếu khung thời gian với log ứng dụng. [Render Service Metrics](https://render.com/docs/service-metrics)
HTTP request logs tích hợp của Render yêu cầu Pro workspace; với Free cần structured log từ app
để biết route nào chậm. [Render Logging](https://render.com/docs/logging)

Diễn giải nhanh:

| Dấu hiệu | Khả năng cao | Việc kiểm tra tiếp |
| --- | --- | --- |
| Lần đầu sau idle >30–60 s, lần sau nhanh | Render cold start | Đo riêng, UX waking state, cân nhắc paid instance nếu SLA không chấp nhận. |
| CPU gần 100%, nhiều API cùng chậm | JS/bcrypt/JSON/render quá tải trên 0.1 CPU | Giảm requests/bundle trước, rate-limit auth, không tăng concurrency mù quáng. |
| Một route p95 cao, Prisma slow query cao | Query/index/join/count | `EXPLAIN ANALYZE`, index/select/pagination. |
| Backend duration thấp, Network download cao | Bundle/ảnh/response lớn/đường truyền | Tree-shake, page response, CDN ảnh. |
| `notifications` hoặc dashboard chậm theo số user/asset | N+1/fan-out/count lặp | Summary aggregate, batch insert, cache badge/catalog. |

## 8. Bảo toàn các quyết định nghiệp vụ khi tối ưu

- Giữ transaction/conditional update cho reserve, handover, return và issue state transition.
  Đừng đổi `Approve All` sang parallel write chỉ để giảm latency.
- Notification phải vẫn theo effective permission, không hard-code role; chỉ dời dispatch ra
  sau commit hoặc batch hoá.
- Không cache quyền hoặc asset status lâu ở server RAM. Một free instance có thể restart bất kỳ
  lúc nào và cache stale có thể làm UI sai.
- Không thay API contract trong patch tối ưu âm thầm. Khi thêm summary/search/page API, cập nhật
  `openapi.yaml`, API catalog và contract cùng task theo `AGENTS.md`.

## 9. Ghi nhận ngoài hiệu năng

`docs/architecture/constitution.md` phần notification vẫn mô tả "chưa có bảng
Notification/listener", trong khi Prisma schema và code hiện đã có `notifications` cùng
notification service/repository. Đây là documentation drift; nên cập nhật ở task kiến trúc
riêng trước khi refactor event sau-commit để tránh dựa vào mô tả cũ.

## Verification của audit

- `pnpm --filter backend typecheck`: pass.
- `pnpm build:frontend`: pass; Vite cảnh báo initial chunk lớn hơn 500 KB.
- Chỉ tạo tài liệu này. Không đổi schema, API, source code hay dữ liệu runtime.

