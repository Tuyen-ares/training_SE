# Stitch Design System Audit

Ngày audit: `2026-07-27`  
Stitch project: `BigIn Asset Management` (`11686200964836917081`)  
Baseline: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)

## 1. Kết luận

Các màn hình Stitch **chưa tuân thủ hoàn toàn** `DESIGN_SYSTEM.md`.

Ở mức nhìn trực tiếp trên desktop, bộ giao diện đã tương đối đồng nhất:

- không còn sidebar, header, title bar hoặc primary action màu xanh;
- AppShell trắng, page background xám nhạt và accent cam được giữ ổn định;
- menu theo role và vị trí identity/avatar đã đồng nhất;
- không phát hiện content hoặc action bị tràn khỏi canvas `1280 × 1024`;
- `USR-03` và `USR-04` hiện đã cùng ngôn ngữ bố cục với nhóm Admin.

Tuy nhiên, strict compliance vẫn chưa đạt vì còn các lỗi có tính hệ thống:

1. Cả `34/34` screen còn dùng `font-weight: 500` ở một số text trong khi
   Design System chỉ cho phép `400` và `600`.
2. `23/34` screen chưa có đúng một semantic `h1`.
3. `18/34` screen có input/select/textarea chưa có accessible label.
4. Source của `10/34` screen còn chứa token xanh cũ dù computed render đã được
   lớp CSS cuối ghi đè thành màu mới.
5. `5/34` screen còn dùng source grid 12 cột thay vì contract 24 cột.
6. `AUTH-02` lệch nhìn thấy rõ nhất: page title `28px` và control chưa theo
   radius `6px`.
7. Responsive, focus management và đầy đủ loading/empty/error/success state
   chưa thể được chứng minh từ các frame desktop cố định của Stitch.
8. White text trên nền `#FF6B00` có contrast xấp xỉ `2.86:1`, không đạt mức
   `4.5:1` cho chữ thường của WCAG AA. Đây là quyết định token cần xử lý trước
   khi đưa filled primary button vào production.

Kết luận ngắn: **desktop visual consistency đạt khá tốt, nhưng source,
semantics, accessibility và responsive contract chưa đạt Definition of Done
của Design System.**

## 2. Phạm vi và phương pháp

Đã review toàn bộ `34` screen ứng dụng hiện hành:

| Nhóm | Số screen |
|---|---:|
| Auth | 2 |
| Staff | 7 |
| Asset Manager | 13 |
| Admin | 12 |
| **Tổng** | **34** |

Không tính vào compliance:

- 4 node tài liệu/reference đang hiển thị trên canvas;
- 42 instance ẩn/phiên bản cũ;
- design-system asset không phải screen ứng dụng.

Mỗi screen được kiểm tra bằng:

1. source HTML hiện tại lấy trực tiếp từ Stitch;
2. computed style sau khi render ở `1280 × 1024`;
3. ảnh render hiện tại;
4. kiểm tra thủ công menu, role, active item, header identity, title, action,
   table/form/detail/modal/drawer và semantic state.

Các cảnh báo máy được kiểm chứng lại bằng ảnh. Ví dụ:

- control `30px` nằm bên trong wrapper input `32px` của `AUTH-01` không được
  tính là lỗi nhìn thấy;
- các action cam lặp theo từng row ở `BOR-06` không phải nhiều page-level
  primary action;
- table inner edge có radius `0` là exception hợp lệ;
- modal/drawer có thể làm audit heading của underlying page báo thừa.

## 3. Kết quả theo tiêu chí

| Tiêu chí | Kết quả | Nhận định |
|---|---:|---|
| Không còn computed green/teal structural color | 34/34 | Đạt |
| Không có horizontal overflow/off-canvas action | 34/34 | Đạt |
| Role menu + identity ở header | 32/32 authenticated screens | Đạt |
| Header/sidebar trắng, page surface xám | 32/32 authenticated screens | Đạt |
| Một `h1` semantic đúng chuẩn | 11/34 | Chưa đạt |
| Không có heading vượt 24px | 33/34 | `AUTH-02` chưa đạt |
| Chỉ dùng weight 400/600 | 0/34 | Lỗi hệ thống |
| Accessible label cho field | 16/34 | Chưa đạt |
| Không còn token xanh trong source | 24/34 | Chưa sạch source |
| Không còn source grid 12 cột | 29/34 | 5 screen cần chuyển |
| Primary action hierarchy nhìn trực tiếp | 34/34 | Đạt sau manual review |
| Responsive mobile/tablet | Chưa xác minh | Stitch hiện chỉ chứng minh desktop |
| Required UI states | Chưa đầy đủ | Cần bổ sung khi implement Vue |
| WCAG AA cho filled primary button | Chưa đạt | Cần chốt lại foreground/background token |

## 4. Kết quả theo từng screen

### 4.1 Auth

| Screen | Visual | Việc còn lại |
|---|---|---|
| AUTH-01 | Đồng nhất | Chuẩn hóa weight; giữ outer input wrapper 32px |
| AUTH-02 | **Cần sửa trực tiếp** | H1 28→24px; radius control→6px; weight; xóa token `#246B59` trong source |

### 4.2 Staff

| Screen | Visual | Việc còn lại |
|---|---|---|
| DASH-01 | Đồng nhất | Đổi page title thành semantic H1; chuẩn hóa weight |
| AST-01 | Đồng nhất | H1; weight; 4 accessible label; xóa 3 token xanh cũ |
| BOR-01 | Đồng nhất | H1; weight; 2 label; kiểm tra outer geometry của date/selector |
| BOR-02 | Đồng nhất | Weight; 2 accessible label |
| BOR-03 | Đồng nhất | H1; weight; 2 label; chuẩn hóa radius control ngoài |
| BOR-04 | Đồng nhất | H1; weight; 1 label; chuẩn hóa radius pagination/control |
| BOR-05 | Đồng nhất | Chỉ còn chuẩn hóa weight |

### 4.3 Asset Manager

| Screen | Visual | Việc còn lại |
|---|---|---|
| DASH-02 | Đồng nhất | H1; weight |
| AST-03 | Đồng nhất | H1; weight |
| AST-04 | Đồng nhất | H1; weight |
| AST-05 | Đồng nhất | H1; weight; 6 label; xóa 2 token xanh cũ |
| BOR-06 | Đồng nhất | H1; weight; 2 label; radius pagination/control |
| BOR-07 | Đồng nhất | Weight; chuyển source grid 12→24; kiểm tra radius control |
| BOR-08 | Modal đúng semantic destructive | Bổ sung heading semantics phù hợp modal; weight |
| BOR-09 | Đồng nhất | H1; weight; 1 accessible label |
| REP-01 | Đồng nhất | H1; weight; xóa 3 token xanh cũ |
| REP-02 | Đồng nhất | Weight; 5 label; xóa token xanh cũ |
| REP-03 | Đồng nhất | Weight; chuyển source grid 12→24; xóa token xanh cũ |
| REP-04 | Drawer đồng nhất | Heading semantics; weight; 3 accessible label; focus trap khi implement |
| REP-05 | Error state đúng màu | H1; weight; 3 accessible label |

### 4.4 Admin

| Screen | Visual | Việc còn lại |
|---|---|---|
| DASH-03 | Đồng nhất | Weight; chuyển source grid 12→24 |
| USR-01 | Đồng nhất | H1; weight; 3 label; radius pagination/control |
| USR-02 | Đồng nhất, là form reference tốt | Chỉ còn chuẩn hóa weight |
| USR-03 | **Đã đồng bộ lại** | H1; weight; chuyển source grid 12→24 |
| USR-04 | **Đã đồng bộ lại** | H1; weight; 7 label; xóa 2 token xanh cũ |
| DEP-01 | Đồng nhất | H1; weight; xóa token xanh cũ |
| AST-02 | Đồng nhất | Weight; 2 label; radius filter/pagination |
| BOR-10 | Đồng nhất | H1; weight; 5 accessible label |
| RBAC-01 | Drawer đồng nhất | H1; weight; 3 label; focus trap khi implement |
| RBAC-02 | Đồng nhất | H1; weight; 2 label; xóa token xanh cũ |
| RBAC-03 | Đồng nhất | Weight; 1 label; chuyển source grid 12→24 |
| SYS-403 | Forbidden state đúng semantic | Weight; xóa token xanh cũ |

## 5. Những vấn đề người dùng đã nêu trước đây

### 5.1 Dashboard và label theo role

- `DASH-01` dùng menu Staff và active `Tổng quan`.
- `DASH-02` dùng menu Asset Manager và active `Tổng quan`.
- `DASH-03` dùng menu Admin; các màn quản lý user/department/RBAC active nhóm
  `Quản trị` là đúng permission model.
- Không còn màn Staff mang navigation quản trị.

### 5.2 Avatar và thông tin người dùng

Tất cả authenticated screen hiện đặt tên, role và avatar ở góc phải header.
Không phát hiện screen nào còn user card/avatar ở cuối sidebar.

### 5.3 Title bar và content surface

Không tái hiện lỗi title bar dùng màu structural khác content trên các render
hiện tại. Header/title shell đều trắng; main content dùng neutral page surface.

### 5.4 USR-03 và USR-04

Hai screen này không còn lệch bố cục rõ như phiên bản cũ:

- `USR-03` dùng profile summary + permission summary + managed asset table;
- `USR-04` dùng một form surface phẳng và chia hai cột hợp lý;
- menu, header identity, page gutter và action placement đã đồng nhất với Admin.

Các lỗi còn lại của hai screen này là source/semantic, không phải một design
language riêng.

## 6. Thứ tự sửa đề xuất

### P0 — Chốt token/accessibility toàn hệ thống

1. Chọn cặp foreground/background đạt WCAG AA cho filled primary button.
2. Sửa design-system asset trong Stitch để bỏ hoàn toàn mô tả legacy:
   dark sidebar, green token, control 36/30px, 4px radius và grid 12 cột.
3. Khóa typography chỉ còn weight 400/600.

### P1 — Sửa visible outlier

1. Sửa `AUTH-02`.
2. Dùng `USR-02`, `USR-03` và `USR-04` hiện tại làm form/detail references,
   không regenerate toàn màn hình.

### P2 — Batch semantic/source cleanup

1. Sửa H1 cho 23 screen.
2. Thêm accessible label cho 18 screen.
3. Xóa legacy green token trong source của 10 screen.
4. Chuyển 5 screen từ source grid 12 cột sang contract 24 cột.
5. Chuẩn hóa control radius theo component outer edge, không sửa table inner edge.

### P3 — Thực thi ở Vue

1. Dùng Ant Design Vue component thật thay cho HTML prototype.
2. Kiểm tra mobile/tablet shell, toolbar wrap, table scroll và form collapse.
3. Bổ sung loading, empty, error, forbidden, success và permission state.
4. Kiểm thử keyboard, focus, screen reader, zoom 200% và reduced motion.

## 7. Audit riêng cho data table

`DESIGN_SYSTEM.md` đã quy định data table, không phải phần còn bỏ trống:

| Thuộc tính | Token/quy tắc bắt buộc |
|---|---|
| Table/panel surface | `#FFFFFF` |
| Header background | `#FAFAFA` |
| Header text | `14px / 600` |
| Row text | `14px / 400` |
| Cell padding | `12–16px` |
| Row border | `#F0F0F0` |
| Row hover | neutral subtle fill |
| Status | tag/badge + text, không chỉ dùng màu |

Inventory hiện tại có `19` table trong `18` screen. Source Stitch chưa dùng một
contract duy nhất:

- `DASH-01` và `DASH-03` là hai ví dụ gần canonical nhất vì source đã ghi rõ
  `#FAFAFA` và `#F0F0F0`.
- `BOR-03`, `BOR-04`, `BOR-05`, `BOR-07`, `BOR-10`, `DEP-01`, `RBAC-02` và
  `USR-03` dùng `#F7F8FA`, `#D9D9D9` hoặc `border-outline-variant`; đây là
  token khác với table contract, dù một số computed render đang bị lớp override
  đưa về gần `#FAFAFA`.
- `AST-02`, `BOR-02`, `BOR-06` và `USR-01` dùng các token
  `surface-container-low`, `surface-variant` và biến thể opacity; đây là
  ngôn ngữ surface cũ của Stitch, không phải token table chuẩn trong file local.
- `AST-01`, `AST-05`, `RBAC-01` và `REP-01` dùng class riêng như
  `enterprise-table`, `dense-table`, `table-header`, `table-row`; các class này
  không có cùng quy ước padding, border và header typography.
- Một số source table vẫn khai báo header `12px/700` hoặc class `font-bold`,
  trong khi local Design System yêu cầu `14px/600`.

Nguyên nhân bạn thấy background không đều là có thật: **local Design System đã
quy định, nhưng design-system asset đang áp dụng trong Stitch chưa được đồng bộ
với file local**. Asset `Operational Excellence System` trong Stitch vẫn còn
prose cũ như grid 12 cột, table header “12px bold”, spacing table 8px và nhiều
surface token Material cũ. Vì vậy việc regenerate hoặc chỉnh riêng từng table có
thể tạo lại khác biệt.

Khi normalize, chỉ nên giữ một mapping: `table/header #FAFAFA`, `row #FFFFFF`,
`border #F0F0F0`, hover dùng một neutral token duy nhất; không dùng zebra row,
green/teal surface, `#F7F8FA` hoặc `surface-variant` cho table thường.

### 7.1 Kết quả normalize trên Stitch — 2026-07-28

Đã gửi `edit_screens` theo bốn batch desktop, bao phủ đủ `19` table trong `18`
screen. Các `project.file_update` event của Stitch xác nhận:

- header/body typography và cell padding đã được đặt theo contract local;
- divider, hover, pagination và table surface đã được chuẩn hóa;
- role navigation, avatar header, labels và workflow không bị regenerate;
- source screen count không tăng trong các batch chỉnh table.

Không đánh dấu asset-import gate là hoàn tất: upload canonical Markdown sau đó
bị Stitch từ chối ở `create_design_system_from_design_md`. Một node `DESIGN.md`
tạm thời còn trong project inventory và cần được ẩn/xóa trong Stitch trước khi
đồng bộ asset chính thức.

## 8. Gate để audit lại

Chỉ kết luận “tuân thủ Design System” khi:

- `AUTH-02` không còn visible mismatch;
- không còn weight 500;
- mỗi page có đúng một H1;
- tất cả field có programmatic label;
- source không còn legacy green token;
- không còn source grid 12 cột ở các screen được audit;
- primary button đạt contrast target đã chốt;
- responsive và required states được kiểm chứng trong frontend thật.
