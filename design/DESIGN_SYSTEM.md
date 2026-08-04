# BigIn Asset Tracking — Design System

> Quy chuẩn UI/UX bắt buộc cho toàn bộ giao diện BigIn Asset Tracking.
>
> Phiên bản: **1.3**
>
> Cập nhật: **2026-07-28**
>
> Nguồn chuẩn: **Ant Design light theme** trong [`DESIGN.md`](DESIGN.md), điều
> chỉnh primary theo logo/thương hiệu BigIn Việt Nam.

> Operational Excellence System trên Stitch là **visual reference** cho swatch
> BigIn (`#FF6B00`, `#595959`, `#007BFF`, `#1F1F1F`). Metadata Material/legacy
> bên trong asset không được ghi đè surface, table, typography, radius hoặc shell
> chuẩn Ant Design trong tài liệu này.

## 1. Mục đích và phạm vi

Design System này định nghĩa cách thiết kế và triển khai:

- application shell và navigation;
- dashboard;
- list, table và data view;
- detail view;
- create/edit form;
- button và action hierarchy;
- input, select, date picker và các control;
- card, modal, drawer, tabs và feedback;
- loading, empty, error, forbidden và success state;
- màu sắc, typography, spacing, radius, shadow và motion;
- responsive behavior và accessibility;
- quy tắc tổ chức component trong Vue.

Tài liệu áp dụng cho:

- prototype Stitch;
- Vue frontend production;
- review UI/UX;
- component mới;
- chỉnh sửa màn hình cũ;
- desktop, tablet và mobile web.

Không màn hình nào được tự tạo một ngôn ngữ hình ảnh riêng. Khi chưa có pattern
phù hợp, phải mở rộng Design System trước khi thêm one-off style vào screen.

## 2. Quan hệ với các tài liệu khác

| Tài liệu | Vai trò |
|---|---|
| [`DESIGN.md`](DESIGN.md) | Nguồn token và nguyên lý Ant Design bắt buộc |
| Operational Excellence System trên Stitch | Tham chiếu visual cho swatch/brand, không ghi đè Ant shell/component token |
| `DESIGN_SYSTEM.md` | Quy chuẩn UI/UX bắt buộc của BigIn |
| [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) | Kiến trúc phần mềm, module, data và workflow |
| [`STITCH_ANT_DESIGN_PROGRESS.md`](../apps/frontend/STITCH_ANT_DESIGN_PROGRESS.md) | Checkpoint prototype Stitch |

Khi có mâu thuẫn về UI:

1. accessibility và tính đúng nghiệp vụ;
2. token trong `DESIGN.md`;
3. `DESIGN_SYSTEM.md`;
4. Operational Excellence System trên Stitch;
5. prototype Stitch đã audit;
6. CSS hoặc component legacy.

CSS legacy không được dùng làm lý do để phá quy chuẩn mới.

### 2.1 Baseline đồng bộ Ant Design + BigIn

Baseline này là mốc review sau mỗi context. `DESIGN.md` quyết định component và
surface; Operational Excellence System chỉ xác nhận màu nhận diện BigIn.

| Hạng mục | Giá trị chuẩn |
|---|---|
| Primary / secondary / info / neutral | `#FF6B00` / `#595959` / `#007BFF` / `#1F1F1F` |
| Page / panel / inset | `#F5F5F5` / `#FFFFFF` / `#FAFAFA` |
| Border / divider | `#D9D9D9` / `#F0F0F0` |
| Semantic | success `#52C41A`, warning `#FAAD14`, error `#FF4D4F` |
| Typography | system sans; page `24/32`, body/table `14/22` |
| Shape | control 6px, panel 8px, control height 32px |
| Desktop shell | sidebar trắng 248px, header trắng 64px |
| Grid / table | Ant 24 cột; header `#FAFAFA`, 14px/600, row 12–16px |

Không dùng `#A04100`, `#FCF9F8`, `#F0EDED`, dark sidebar, grid 12 cột hoặc table
header 12px uppercase từ metadata legacy của asset Stitch để triển khai BigIn.

## 3. Nguyên tắc thiết kế

### 3.1 Work-focused

Giao diện phục vụ công việc nội bộ, không phải landing page marketing.

- Đưa nhiệm vụ chính và dữ liệu cần xử lý vào viewport đầu.
- Ưu tiên table, list, form và description list.
- Không dùng hero lớn, slogan dài hoặc hình minh họa lấn át nghiệp vụ.
- Không biến mỗi row thành một card trên desktop.
- Không lồng nhiều card chỉ để tạo khoảng cách.

### 3.2 Certain

Người dùng luôn biết:

- đang ở khu vực nào;
- dữ liệu đang ở trạng thái gì;
- action nào là chính;
- action đã chạy, đang chạy hay thất bại;
- thay đổi có gây mất dữ liệu hoặc ảnh hưởng người khác không.

Hover, focus, active, loading, disabled, validation và error phải nhìn thấy rõ.

### 3.3 Consistent

Một hành động phải có cùng:

- tên gọi;
- màu;
- icon;
- vị trí tương đối;
- confirmation behavior;
- feedback behavior;

trên mọi màn hình.

Ví dụ: thao tác ngừng tài khoản không được gọi là “Xóa” ở list nhưng gọi là
“Vô hiệu hóa” ở detail. Dùng một nhãn nghiệp vụ nhất quán.

### 3.4 Permission-aware

Giao diện phản ánh permission nhưng không thay thế backend authorization.

- Menu, shortcut và action được render theo permission thực tế của user.
- Khi user có nhiều role, UI dùng hợp permission được cấp qua các role đó.
- Không suy ra permission theo tên role và không áp dụng role hierarchy.
- Action không đủ quyền phải ẩn nếu hoàn toàn không có ý nghĩa với user.
- Action tạm thời không khả dụng do trạng thái dữ liệu phải disable và giải thích.
- Backend vẫn kiểm permission cho mọi request.

### 3.5 Flat-first

- Dùng border và surface contrast để tạo phân cấp.
- Shadow chỉ dùng cho popup, modal, dropdown, drawer hoặc surface thực sự nổi.
- Không dùng gradient, glassmorphism, neon hoặc shadow dày cho panel thông thường.

## 4. Design tokens

Mọi giá trị triển khai phải đi qua token. Không hard-code màu lặp lại trong từng
view.

### 4.1 Token CSS chuẩn

```css
:root {
  /* Brand */
  --bigin-color-primary: #ff6b00;
  --bigin-color-primary-hover: #ff8533;
  --bigin-color-primary-active: #d95a00;
  --bigin-color-primary-soft: #fff2e6;
  --bigin-color-primary-text: #b54700;

  /* Semantic */
  --bigin-color-success: #52c41a;
  --bigin-color-success-bg: #f6ffed;
  --bigin-color-warning: #faad14;
  --bigin-color-warning-bg: #fffbe6;
  --bigin-color-error: #ff4d4f;
  --bigin-color-error-bg: #fff2f0;
  --bigin-color-info: #007bff;
  --bigin-color-info-strong: #0958d9;
  --bigin-color-info-bg: #e6f4ff;

  /* Surface */
  --bigin-surface-page: #f5f5f5;
  --bigin-surface-panel: #ffffff;
  --bigin-surface-inset: #fafafa;
  --bigin-surface-elevated: #ffffff;

  /* Text */
  --bigin-text-primary: #1f1f1f;
  --bigin-text-secondary: #595959;
  --bigin-text-tertiary: rgba(0, 0, 0, 0.45);
  --bigin-text-placeholder: rgba(0, 0, 0, 0.25);
  --bigin-text-disabled: #bfbfbf;
  --bigin-text-inverse: #ffffff;

  /* Icon */
  --bigin-icon-default: #595959;
  --bigin-icon-hover: #ff6b00;
  --bigin-icon-disabled: #bfbfbf;

  /* Border */
  --bigin-border-default: #d9d9d9;
  --bigin-border-subtle: #f0f0f0;

  /* Selection and focus */
  --bigin-selection-background: #fff2e6;
  --bigin-selection-border: #ff6b00;
  --bigin-focus-ring: 0 0 0 2px rgba(255, 107, 0, 0.2);

  /* Geometry */
  --bigin-radius-control: 6px;
  --bigin-radius-surface: 8px;
  --bigin-radius-small: 4px;
  --bigin-control-height: 32px;

  /* Spacing */
  --bigin-space-1: 4px;
  --bigin-space-2: 8px;
  --bigin-space-3: 12px;
  --bigin-space-4: 16px;
  --bigin-space-5: 20px;
  --bigin-space-6: 24px;
  --bigin-space-8: 32px;

  /* Shell */
  --bigin-sidebar-width: 248px;
  --bigin-header-height: 64px;

  /* Motion */
  --bigin-motion-fast: 100ms;
  --bigin-motion-mid: 200ms;
  --bigin-motion-slow: 300ms;
}
```

Các bước `12px` và `20px` được phép vì vẫn nằm trên lưới 4px. Không thêm khoảng
cách 10px, 14px, 18px hoặc giá trị ngẫu nhiên cho từng screen.

## 5. Màu sắc

### 5.1 Brand primary

Orange `#FF6B00` được dùng cho:

- một primary action chính trong mỗi vùng;
- active navigation;
- active tab;
- link;
- focus/selection có tính tương tác;
- điểm nhấn thương hiệu nhỏ.

`#FF6B00` là primary theo logo BigIn và token Ant Design đã được xác nhận bởi
bảng Operational Excellence System. Hover dùng `#FF8533`, active dùng `#D95A00`.

Không dùng orange cho:

- toàn bộ sidebar hoặc header;
- nền page lớn;
- mọi card dashboard;
- trạng thái success/warning chỉ vì muốn nổi bật;
- nhiều primary button đứng cạnh nhau.

### 5.2 Semantic colors

Success, warning, error và info dùng token Ant Design để biểu đạt trạng thái
asset/borrow/repair. Chúng không thay thế primary orange và luôn đi kèm text hoặc
icon.

| Ý nghĩa | Màu | Ví dụ |
|---|---|---|
| Success | `#52C41A` | Sẵn sàng, hoàn tất, đã trả |
| Warning | `#FAAD14` | Chờ duyệt, sắp quá hạn |
| Error | `#FF4D4F` | Hư hỏng, thất bại, destructive |
| Info | `#007BFF` | Đang mượn, thông tin QR, đang xử lý |

Màu semantic chỉ biểu đạt ý nghĩa trạng thái. Luôn đi kèm text hoặc icon; không
dùng màu làm tín hiệu duy nhất.

### 5.3 Neutral surfaces

```text
Page background       #F5F5F5
Panel/card/table       #FFFFFF
Inset/table header     #FAFAFA
Default border         #D9D9D9
Subtle divider         #F0F0F0
```

Header, sidebar và title bar luôn trắng. Không dùng full green, blue, teal, dark
hoặc orange cho structural shell.

### 5.4 Domain status mapping

Tập status, nhãn và vòng đời domain phải lấy từ canonical requirement/domain
specification; Design System không định nghĩa enum hoặc workflow nghiệp vụ.

`StatusTag` chỉ chuẩn hóa cách trình bày: map mỗi status được domain cung cấp sang
treatment semantic phù hợp, luôn có nhãn text và không dùng màu làm tín hiệu duy
nhất. Quy ước visual tham khảo:

| Ý nghĩa do domain xác định | Treatment gợi ý |
|---|---|
| Hoàn tất, khả dụng hoặc hợp lệ | Success |
| Đang chờ, cần chú ý hoặc đang xử lý | Warning hoặc Info theo ngữ cảnh |
| Thất bại, lỗi hoặc không khả dụng | Error |
| Đã kết thúc hoặc không còn hoạt động | Neutral/disabled |

Các ví dụ trên không phải danh sách status chuẩn và không thay thế requirement.

## 6. Typography

### 6.1 Font family

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  "Noto Sans",
  sans-serif;
```

### 6.2 Type scale

| Token | Size/line-height | Weight | Dùng cho |
|---|---|---|---|
| Page title | `24/32px` | 600 | H1 duy nhất của page |
| Section title | `20/28px` | 600 | Section lớn |
| Card title | `16/24px` | 600 | Card/panel title |
| Body | `14/22px` | 400 | Nội dung và control |
| Body strong | `14/22px` | 600 | Table header, label nổi bật |
| Supporting | `12/20px` | 400 | Metadata, helper, tag |
| Display metric | `30/38px` | 600 | KPI quan trọng, dùng hạn chế |

Quy định:

- Mỗi page chỉ có một `h1`.
- Không dùng page heading lớn hơn 24px trong authenticated app.
- Chỉ dùng weight 400 và 600.
- Không dùng italic trong application chrome.
- Không viết cả câu dài bằng uppercase.
- Số liệu phải dùng locale phù hợp và căn phải khi cần so sánh.

## 7. Spacing, shape và elevation

### 7.1 Spacing

| Ngữ cảnh | Khoảng cách |
|---|---:|
| Icon và label trong control | 8px |
| Các control cùng nhóm | 8px |
| Field label đến control | 4–8px |
| Các field trong form | 16px |
| Các group nhỏ | 16px |
| Section trong panel | 24px |
| Page content gutter desktop | 24–32px |
| Page header đến content | 24px |

### 7.2 Radius

| Thành phần | Radius |
|---|---:|
| Button/input/select | 6px |
| Card/modal/drawer | 8px |
| Tag/tooltip | 4px |
| Avatar/status dot | Full circle |
| Table inner edge | 0 hoặc theo container ngoài |

Không dùng pill radius cho button thông thường.

### 7.3 Shadow

- Page, section và table không có shadow mặc định.
- Card chỉ dùng shadow nhẹ khi thực sự cần tách khỏi page.
- Dropdown/popover/modal dùng Ant elevation token.
- Drawer dùng shadow ở cạnh gắn với content.
- Không tự tạo nhiều shadow tier ngoài token.

## 8. Responsive breakpoints

### 8.1 Grid

BigIn dùng grid 24 cột theo Ant Design.

| Viewport | Grid gutter |
|---|---:|
| Mobile | 16px |
| Tablet | 16px |
| Desktop | 24px |
| Wide | 24–32px |

- Tổng span của một hàng không vượt 24.
- Form hai cột thường dùng `12 + 12`.
- Main/secondary detail có thể dùng `16 + 8`.
- Metric dashboard có thể dùng `6 + 6 + 6 + 6`.
- Grid phải collapse về một cột khi nội dung không còn đọc được.
- Không dùng absolute positioning để thay grid.
- Không đặt width pixel riêng cho từng card khi span/gutter giải quyết được.

### 8.2 Breakpoint behavior

| Breakpoint | Phạm vi | Behavior chính |
|---|---:|---|
| Mobile | `< 576px` | Một cột, drawer navigation |
| Tablet | `576–991px` | Sidebar collapse/drawer, toolbar wrap |
| Desktop | `992–1439px` | AppShell đầy đủ |
| Wide | `≥ 1440px` | Giữ line length và content max-width |

Breakpoint là layout decision, không dùng để thay đổi ngôn ngữ design.

## 9. Application shell

### 9.1 Desktop contract

```text
┌───────────────────────────────────────────────────────────┐
│ Sidebar 248px │ Header 64px: breadcrumb | user + avatar  │
│               ├───────────────────────────────────────────┤
│ Navigation    │ Page background #F5F5F5                  │
│               │ ┌───────────────────────────────────────┐ │
│               │ │ Page header: title + actions         │ │
│               │ └───────────────────────────────────────┘ │
│               │ Main content                             │
└───────────────────────────────────────────────────────────┘
```

Sidebar:

- rộng `248px`;
- nền trắng;
- border phải `#F0F0F0`;
- selected item nền `#FFF2E6`, text/icon `#FF6B00`;
- label dài được ellipsis + tooltip;
- không để avatar/user card ở cuối sidebar.

Header:

- cao `64px`;
- nền trắng;
- border dưới `#F0F0F0`;
- breadcrumb/page context ở trái;
- user name, role, avatar và account menu ở phải;
- vị trí identity giống nhau cho mọi role và page.

Main:

- nền `#F5F5F5`;
- padding desktop `24px`;
- không đặt toàn bộ page vào một floating card;
- width theo loại task, không mặc định stretch form toàn màn hình.

### 9.2 Tablet/mobile shell

- Sidebar chuyển thành drawer hoặc collapsed rail.
- Header vẫn giữ page context và account action.
- Primary action phải còn nhìn thấy.
- Secondary action có thể chuyển vào overflow menu.
- Không chuyển user identity xuống cuối navigation.
- Drawer navigation đóng sau khi chọn route.

### 9.3 Permission-aware navigation

Sidebar, header shortcut và dashboard entry được render theo permission mapping
đã được product/frontend specification xác nhận. Không hard-code menu theo tên
role hoặc giả định Admin > Manager > Staff.

- User có nhiều role nhìn thấy hợp các menu/action mà permission của họ cho phép.
- User chỉ có permission xem không được thấy action làm thay đổi dữ liệu.
- Action không có quyền ẩn khi không có ý nghĩa; action tạm thời không khả dụng do
  trạng thái dữ liệu thì disable và giải thích.
- Direct route vẫn cần xử lý trạng thái forbidden; UI không thay backend
  authorization.

## 10. Anatomy chuẩn của một page

```text
Page
├── Breadcrumb (khi có hierarchy)
├── PageHeader
│   ├── Title + optional status
│   ├── Description ngắn, chỉ khi cần
│   └── Action group
├── Optional summary/filters
├── Main content
└── Optional sticky action footer
```

Page header:

- title ở trái;
- primary action ngoài cùng bên phải;
- destructive action không đứng sát primary nếu dễ bấm nhầm;
- mô tả tối đa 1–2 dòng;
- không lặp title lần nữa trong card đầu tiên.

## 11. Page templates

### 11.1 Dashboard view

```text
PageHeader
[Optional summary metrics]
[Primary work queue / recent activity]
[Secondary overview]
```

Đây là template tùy chọn. Chỉ dùng summary, KPI, chart hoặc activity khi
frontend/product specification yêu cầu; không tự tạo analytics hoặc KPI chỉ vì
Design System hỗ trợ dashboard.

Khi dashboard có các phần trên:

- KPI card chỉ hiển thị số liệu có giá trị quyết định.
- Không tạo card “filler”.
- Card KPI có cùng chiều cao.
- Màu card trung tính; semantic color dùng ở icon/status nhỏ.
- Work queue phải có link/action tới màn hình xử lý.
- Chart chỉ dùng khi biểu diễn xu hướng hoặc so sánh tốt hơn table.

### 11.2 List/table view

```text
PageHeader + Create action
Data panel
├── Toolbar
│   ├── Search
│   ├── Filters
│   ├── View controls
│   └── Bulk actions
├── Table/List
└── Pagination + result count
```

### 11.3 Detail view

```text
Breadcrumb
PageHeader: entity identity + status + actions
Main column
├── Description section
├── Related records/history
└── Activity
Secondary column (chỉ khi có giá trị)
└── Ownership/status/quick facts
```

### 11.4 Create/edit view

```text
Breadcrumb
PageHeader
Form surface, max-width theo độ phức tạp
├── Field groups
└── Action footer: Cancel | Save
```

### 11.5 Workflow view

Dùng cho approve, reject, check-in, repair:

```text
Context summary
Current state
Required decision/input
Impact preview
Primary action + cancel
```

Không buộc người dùng chuyển qua nhiều page nếu drawer/modal giữ context tốt hơn.

### 11.6 Error/forbidden view

- Không selected navigation item nếu route không thuộc khu vực hợp lệ.
- Nêu rõ user không có quyền hoặc resource không tồn tại.
- Có action quay về nơi an toàn.
- Không lộ resource của user khác qua nội dung lỗi.

## 12. List và table

### 12.1 Khi nào dùng

Use table khi:

- record có cùng field;
- user cần so sánh hàng;
- cần sort/filter/pagination;
- có nhiều record.

Use list khi:

- nội dung record khác nhau đáng kể;
- thứ tự đọc quan trọng;
- record có mô tả dài;
- mobile cần representation riêng.

Không dùng card-per-row cho data table desktop.

### 12.2 List specification

List item chuẩn:

```text
Leading icon/avatar (optional)
Primary content
├── Identifier/title
├── Supporting description
└── Metadata
Trailing content
├── Status/value
└── Actions
```

- Item cách nhau bằng divider hoặc spacing, không cần card riêng.
- Primary content phải chiếm phần co giãn.
- Trailing action có width ổn định.
- Metadata ưu tiên 1–2 dòng, phần ít quan trọng có thể ẩn trên mobile.
- List có selection phải dùng checkbox rõ ràng.

### 12.3 Table specification

| Thuộc tính | Quy chuẩn |
|---|---|
| Header background | `#FAFAFA` |
| Header typography | 14px / 600 |
| Row typography | 14px / 400 |
| Cell padding | 12–16px |
| Row hover | Neutral subtle fill |
| Border | `#F0F0F0` |
| Numeric column | Căn phải |
| Status | Tag/badge + text |
| Action column | Căn phải, width ổn định |

Column order:

1. selection nếu có bulk action;
2. primary identifier;
3. thông tin dùng so sánh;
4. status;
5. updated/date/owner;
6. actions.

Primary identifier có thể là link tới detail. Không biến toàn bộ row thành link
nếu row có checkbox hoặc nhiều action tương tác.

### 12.4 Toolbar

- Search nằm đầu toolbar.
- Filter liên quan đặt gần search.
- Create action thuộc PageHeader, không lặp trong toolbar.
- Refresh/view setting dùng icon button có tooltip.
- Bulk action chỉ xuất hiện khi có selection.
- Toolbar được wrap theo nhóm trên tablet/mobile.
- Filter đang áp dụng phải nhìn thấy và có “Xóa bộ lọc”.

### 12.5 Row actions

- Action thường xuyên: hiển thị trực tiếp tối đa 1–2.
- Action ít dùng: overflow menu.
- View/edit dùng icon nếu đã có convention rõ; luôn có accessible label.
- Destructive action dùng text rõ trong menu và confirmation.
- Không dùng ba icon không nhãn nếu ý nghĩa khó đoán.

### 12.6 Pagination

- Đặt dưới table, không che row cuối.
- Hiển thị tổng số record.
- Giữ page/filter/sort trong route query khi có ích cho back navigation.
- Reset về page 1 khi filter thay đổi.
- Không dùng infinite scroll cho màn hình quản trị cần truy vết vị trí.

### 12.7 Table responsive

Chọn một trong ba chiến lược:

1. horizontal scroll với first/action column cố định;
2. ẩn column phụ theo priority;
3. chuyển sang list mobile được thiết kế riêng.

Không nén text đến mức mất khả năng đọc. Không wrap tất cả column thành row cao
không kiểm soát.

## 13. Detail view

### 13.1 Entity identity

PageHeader phải cho biết:

- tên hoặc mã chính;
- status;
- metadata quan trọng nhất;
- action phù hợp trạng thái và permission.

### 13.2 Description data

Dùng description list thay cho form readonly.

```text
Label            Value
Mã thiết bị      AST-000123
Serial number    ...
Model            ...
Phòng ban        ...
```

- Label dùng secondary text.
- Value dùng primary text.
- Missing value hiển thị `—`, không để ô trống.
- Long identifier có copy action.
- Date/time có format nhất quán.

### 13.3 Related data

History, borrow details và repair logs dùng table/timeline phù hợp. Không lồng
card cho từng record.

### 13.4 Detail actions

- Primary action phản ánh bước tiếp theo hợp lệ.
- Action không hợp lệ do state phải disable + tooltip giải thích.
- Destructive/terminal action yêu cầu confirmation.
- Không hiển thị action backend chưa hỗ trợ.

## 14. Forms

### 14.1 Form width

| Loại form | Max width |
|---|---:|
| Đăng nhập | 432px |
| Form đơn giản | 560–640px |
| Form chuẩn | 720px |
| Form hai cột phức tạp | 896px |
| Full-width data editor | Chỉ khi nghiệp vụ yêu cầu |

Không stretch input text ngắn hết viewport.

### 14.2 Layout form

- Một cột là mặc định.
- Hai cột chỉ khi field ngắn và có quan hệ rõ.
- Mobile luôn về một cột.
- Field phụ thuộc nằm cạnh hoặc ngay sau field điều khiển.
- Section dùng title + divider/spacing, không mỗi section một card lồng nhau.

### 14.3 Label và helper

- Label đặt trên control để responsive ổn định.
- Required dùng indicator nhất quán.
- Helper text ở dưới control, chỉ khi hữu ích.
- Validation message chiếm vị trí ổn định để hạn chế layout shift.
- Placeholder là ví dụ, không thay label.

### 14.4 Validation

- Validate field khi blur hoặc sau lần submit đầu.
- Không báo lỗi ngay khi user chưa tương tác.
- Error message nói cách sửa.
- API error map về field nếu có field tương ứng.
- Global form error đặt đầu form.
- Focus field lỗi đầu tiên sau submit.

### 14.5 Action footer

Thứ tự chuẩn:

```text
[Hủy] [Lưu thay đổi]
```

- Primary button ở cuối theo hướng đọc.
- Submit có loading và disabled chống double submit.
- Hủy quay lại an toàn; nếu có unsaved changes phải confirm.
- Không đặt Reset cạnh Save nếu dễ gây mất dữ liệu.
- Form dài có thể dùng sticky footer trong content region.

## 15. Buttons

### 15.1 Kích thước

Mọi button và icon button trong BigIn dùng chiều cao/khung `32px`, kể cả Auth.
Trên mobile, có thể mở rộng vùng bấm vô hình hoặc wrapper để đạt touch target mà
không thay đổi visual height của control.

Không tự tạo button `24px`, `30px`, `34px`, `36px`, `40px` hoặc `44px`.

### 15.2 Button hierarchy

| Loại | Dùng cho |
|---|---|
| Primary | Action chính duy nhất trong một region |
| Default | Action phụ |
| Text | Action ít nhấn mạnh, close/cancel theo ngữ cảnh |
| Link | Điều hướng |
| Danger | Destructive action đã xác định rõ |
| Icon | Toolbar/action phổ biến, phải có label/tooltip |

### 15.3 Quy tắc

- Một region chỉ có một primary button.
- Label dùng động từ + đối tượng: `Tạo yêu cầu`, `Lưu thay đổi`, `Duyệt yêu cầu`.
- Không dùng label mơ hồ như `OK`, `Submit`, `Xử lý`.
- Icon đứng trước text, gap 8px.
- Loading giữ nguyên width, không làm layout nhảy.
- Disabled vẫn phải đọc được nhưng không giống enabled.
- Danger không dùng primary orange.
- Destructive action phải mô tả hậu quả trong confirmation.

### 15.4 Button order trong dialog

```text
Secondary/Cancel | Primary confirm
```

Với destructive confirm:

```text
Hủy | Ngừng sử dụng
```

Confirm button dùng danger treatment khi action không dễ phục hồi.

### 15.5 Icon trong action

| Ngữ cảnh | Icon size |
|---|---:|
| Trong button/control | 14–16px |
| Navigation | 16–20px |
| Empty/result illustration | Theo component, không dùng như action |

- Dùng một icon library thống nhất.
- Cùng action phải dùng cùng icon.
- Icon không thay text cho action khó đoán.
- Icon button vẫn có khung `32 × 32px`.
- Decorative icon dùng `aria-hidden`.

## 16. Input và selection controls

### 16.1 Shared control contract

- chiều cao `32px`;
- radius `6px`;
- base text `14px`;
- border `#D9D9D9`;
- placeholder dùng `--bigin-text-placeholder`, không dùng brand hoặc semantic
  color;
- icon suffix mặc định dùng `--bigin-icon-default`; chỉ chuyển primary khi
  control hoặc chính icon đang hover/focus/active;
- focus dùng primary border và `--bigin-focus-ring`;
- disabled dùng neutral surface/text;
- error dùng error border + message;
- width theo nội dung và layout.

### 16.2 Input

- Dùng đúng `type`, `autocomplete` và input mode.
- Search input có clear action.
- Password có show/hide với accessible label. Nút hiện/ẩn mật khẩu phải dùng
  được bằng bàn phím, mặc định `#595959`, hover/focus `#FF6B00` và disabled
  `#BFBFBF`.
- Number dùng min/max/step và format rõ.
- Textarea theo content, không ép về 32px.

### 16.3 Select

- Dùng cho bounded options.
- Searchable nếu danh sách dài.
- Không dùng select cho 2 lựa chọn binary; dùng radio/switch.
- Placeholder không được coi là option hợp lệ.
- Placeholder và suffix arrow dùng token neutral; không dùng màu cam khi
  control chưa hover/focus/active.
- Empty options có explanation.

### 16.4 Checkbox, radio, switch

- Checkbox: chọn nhiều hoặc xác nhận.
- Radio: chọn đúng một trong vài option nhìn thấy.
- Switch: thay đổi trạng thái tức thời.
- Không dùng switch cho action destructive cần confirmation.
- Click target gồm cả label.

### 16.5 Role và permission selection card

Selection card được dùng khi mỗi lựa chọn cần cả tên, mô tả và metadata mà
checkbox/radio đơn lẻ không truyền tải đủ. Đây là control chọn lựa, không phải
card trang trí.

#### Semantic và cấu trúc

- Chọn nhiều vai trò dùng checkbox thật; chọn đúng một lựa chọn dùng radio thật.
- Cả card là click target của control nhưng không được tạo nested interactive
  elements gây xung đột keyboard.
- Nhóm lựa chọn dùng `fieldset` + `legend` hoặc semantics tương đương; helper và
  validation message phải liên kết với group.
- Anatomy chuẩn: selection control, optional icon, title, supporting description
  và optional permission badge.
- Title dùng `14px/22px` weight `600`; description dùng `12px/20px` weight `400`.

#### State contract

| State | Background | Border/ring | Checkbox/radio | Icon và text |
|---|---|---|---|---|
| Default | `#FFFFFF` | `#D9D9D9` | unchecked | icon `#595959`, text chuẩn |
| Hover | `#FFFFFF` | `#FF8533` | giữ state thật | icon tương tác `#FF6B00` |
| Focus-visible | giữ background hiện tại | `--bigin-focus-ring` | giữ state thật | focus phải nhìn thấy rõ |
| Selected | `#FFF2E6` | `#FF6B00` | checked | icon `#FF6B00`, title `#1F1F1F` |
| Disabled | `#FAFAFA` | `#D9D9D9` | disabled | text/icon `#BFBFBF` |
| Error group | không đổi hàng loạt card | message `#FF4D4F` tại group | giữ state thật | nêu cách sửa |

Selected state bắt buộc đồng bộ tối thiểu ba tín hiệu:

1. checkbox/radio ở trạng thái checked;
2. background dùng `--bigin-selection-background`;
3. border hoặc accent dùng `--bigin-selection-border`.

Không được hiển thị border/accent selected trong khi native control vẫn
unchecked. Không dùng màu làm tín hiệu duy nhất. Phím `Space` phải toggle lựa
chọn đang focus; focus order phải theo visual order.

#### Badge cấp quyền

- Badge cấp quyền là metadata, không phải error/status badge.
- `Toàn quyền` dùng chữ thường theo sentence case, text `12px`.
- Treatment chuẩn: background `#FFF2E6`, text `#B54700`, không dùng màu đỏ.
  Cặp màu này đạt khoảng `4.94:1` cho text thường; không dùng `#D95A00` cho
  badge 12px vì không đạt WCAG AA trên primary-soft background.
- Error red chỉ dùng khi quyền bị lỗi, bị thu hồi hoặc thao tác thất bại; không
  dùng đỏ chỉ vì permission có phạm vi rộng.
- Role card không được tự suy ra permission từ tên role; nội dung phải lấy từ
  permission mapping đã được backend/domain xác nhận.

### 16.6 Date/time

- Hiển thị format nhất quán theo locale Việt Nam.
- Date range phải thể hiện rõ start/end.
- Không lưu chuỗi format UI thay cho timestamp/domain date chuẩn.
- Rule kiểm tra domain lấy từ requirement; UI hiển thị lỗi ngay dưới control,
  giữ input người dùng đã nhập khi có thể và đưa focus tới field không hợp lệ khi
  submit thất bại.

## 17. Navigation components

### 17.1 Breadcrumb

- Dùng khi page sâu hơn một cấp.
- Không lặp item cuối thành link.
- Label ngắn, theo domain.
- Mobile có thể collapse middle items.

### 17.2 Tabs

- Dùng cho các view ngang cấp của cùng entity/context.
- Active tab text và underline dùng primary.
- Không dùng tab để giả navigation giữa module không liên quan.
- Tab state có thể nằm trong route/query nếu cần share/back.

### 17.3 Menu

- Selected item duy nhất.
- Group label dùng secondary text.
- Item không có quyền không render.
- Disabled chỉ khi item tồn tại nhưng tạm không khả dụng.
- Không dùng màu semantic cho menu active.

### 17.4 Dropdown

- Dùng cho action ít thường xuyên.
- Action destructive tách bằng divider khi phù hợp.
- Không đặt primary workflow bắt buộc vào overflow trên desktop.

## 18. Data display components

### 18.1 Card

Card chỉ dùng cho:

- summary metric;
- framed tool;
- nhóm nội dung có boundary độc lập;
- repeated object có cấu trúc không phù hợp table.

Không dùng card:

- bao toàn bộ page;
- lồng card nhiều tầng;
- cho mỗi table row;
- chỉ để tạo padding.

### 18.2 Tag và badge

- Tag dùng category/status compact.
- Text 12px, radius 4px.
- Không chỉ hiển thị dot nếu trạng thái quan trọng.
- Status label phải dùng từ vựng domain chuẩn.
- Không dùng nhiều preset color không có meaning.
- Permission-level badge không dùng semantic error color. `Toàn quyền` dùng
  primary-soft `#FFF2E6` với primary-text `#B54700` và label sentence case.

### 18.3 Avatar

- Dùng circle.
- Có fallback initials.
- User identity authenticated luôn ở top-right header.
- Không thay đổi vị trí giữa role/screen.

### 18.4 Statistic

- Chỉ dùng cho số đo có ngữ cảnh.
- Có label, value và optional trend.
- Trend semantic không được nhầm với asset status.
- Không dùng display metric cho số liệu thứ yếu.

### 18.5 Timeline

Dùng cho chuỗi event có thời gian như:

- tạo yêu cầu;
- duyệt/từ chối;
- bàn giao;
- trả;
- bắt đầu/kết thúc sửa.

Không dùng timeline thay table nếu user cần so sánh nhiều record.

## 19. Feedback và overlays

### 19.1 Alert

- Success: hoàn thành hành động quan trọng.
- Warning: điều kiện cần chú ý.
- Error: lỗi có thể đọc và xử lý.
- Info: thông tin hướng dẫn.
- Alert có title khi nội dung dài.
- Không dùng alert như decoration.

### 19.2 Toast/message

- Dùng feedback ngắn sau mutation.
- Không chứa nội dung cần đọc lâu.
- Error cần hành động hoặc chi tiết phải đặt trong page/alert.
- Không hiển thị nhiều toast cho cùng một action.

### 19.3 Modal

Dùng khi:

- quyết định ngắn;
- cần confirmation;
- context nền vẫn quan trọng.

Quy định:

- title rõ hành động;
- body mô tả tác động;
- action ở footer;
- focus trap;
- Escape/close chỉ khi an toàn;
- không dùng modal cho form dài nhiều section.

Kích thước chuẩn:

| Modal | Width | Dùng cho |
|---|---:|---|
| Small | 416px | Confirm ngắn |
| Default | 520px | Form/decision thông thường |
| Wide | 720px | Nội dung cần so sánh vừa phải |

Trên mobile, modal chừa tối thiểu 16px hai bên viewport.

### 19.4 Drawer

Dùng cho:

- detail phụ;
- edit/create vừa phải;
- workflow giữ list context;
- QR/detail quick view.

Drawer:

- mở từ phải;
- width `480px` cho detail/form thường, `640px` cho workflow phức tạp;
- header và action footer cố định nếu body scroll;
- back/close behavior rõ;
- hidden drawer không được làm canvas/layout chính overflow.

Trên mobile, drawer chiếm toàn bộ chiều rộng.

### 19.5 Tooltip

- Dùng cho icon action hoặc text bị truncate.
- Không chứa business-critical instruction duy nhất.
- Không xuất hiện cho disabled element nếu framework không hỗ trợ focus; bọc bằng
  accessible trigger phù hợp.

## 20. Required view states

Mọi data-driven screen phải có:

### 20.1 Loading

- Skeleton giữ geometry gần dữ liệu thật.
- Không dùng spinner toàn page cho table lớn nếu skeleton hợp lý hơn.
- Disable mutation trong lúc submit.
- Không dùng skeleton màu xanh/teal legacy.

### 20.2 Empty

Empty state gồm:

- tiêu đề ngắn;
- lý do hoặc bước tiếp theo;
- action phù hợp permission nếu có.

Phân biệt:

- chưa có dữ liệu;
- không có kết quả do filter;
- user không có quyền;
- dữ liệu đã bị archive/retire.

### 20.3 Error

- Nói request nào thất bại.
- Có retry khi lỗi recoverable.
- Giữ filter/input nếu có thể.
- Không hiển thị stack trace hoặc lỗi DB.

### 20.4 Forbidden

- Hiển thị thông báo quyền hạn rõ.
- Không render data nhạy cảm trước khi redirect.
- Có đường về dashboard hoặc page an toàn.

### 20.5 Success

- Feedback không che bước tiếp theo.
- Modal/drawer chỉ đóng sau khi mutation thành công.
- List/detail được cập nhật hoặc refetch nhất quán.

### 20.6 Stale/partial

Nếu giữ dữ liệu cũ khi refresh thất bại:

- nói dữ liệu có thể đã cũ;
- cho phép retry;
- không giả vờ trạng thái đang hoàn toàn mới.

## 21. Destructive và sensitive actions

Action destructive, terminal hoặc ảnh hưởng quyền truy cập phải có confirmation.
Việc action nào thuộc nhóm này do requirement/frontend specification quyết định.

Ví dụ có thể cần confirmation:

- deactivate user;
- retire asset;
- delete lookup;
- reject borrow request;
- close repair với kết quả thất bại;
- thay role/permission có ảnh hưởng truy cập.

Confirmation phải nêu:

- đối tượng;
- hậu quả;
- khả năng phục hồi;
- dependency đang chặn action nếu có.

Không dùng màu đỏ cho action chỉ đơn giản là “Quay lại” hoặc “Hủy dialog”.

## 22. Content design

### 22.1 Ngôn ngữ

- UI chính dùng tiếng Việt.
- Dùng thuật ngữ domain nhất quán.
- Không trộn `Create`, `Submit`, `Edit` vào flow tiếng Việt.
- Technical identifier có thể giữ nguyên tiếng Anh/code.

### 22.2 Label chuẩn

| Tránh | Dùng |
|---|---|
| Submit | Lưu / Tạo yêu cầu |
| OK | Xác nhận / Duyệt |
| Delete user | Ngừng tài khoản |
| Delete asset | Ngừng sử dụng |
| Back | Quay lại |
| Checkout | Bàn giao thiết bị |
| Check-in | Nhận trả thiết bị |

### 22.3 Error copy

Error tốt:

```text
Không thể duyệt yêu cầu vì một thiết bị không còn ở trạng thái đã giữ chỗ.
Hãy tải lại dữ liệu và kiểm tra yêu cầu.
```

Error không đạt:

```text
Error 409.
```

## 23. Accessibility

Mức mục tiêu: WCAG AA cho ứng dụng web.

- Mọi input có label.
- Icon-only button có accessible name.
- Focus visible và theo visual order.
- Modal/drawer quản lý focus.
- Text/status không phụ thuộc màu.
- Contrast của primary button phải được đo; white text trên `#FF6B00` không được
  mặc định coi là đạt.
- Touch target mobile tối thiểu đủ dùng, dù visual control có thể 32px.
- Table có header semantic.
- Validation dùng `aria-invalid` và liên kết message.
- Live feedback quan trọng dùng vùng announcement phù hợp.
- Zoom 200% không mất action.
- Reduced motion được tôn trọng.

## 24. Motion

| Loại | Duration |
|---|---:|
| Hover/focus/press | 100ms |
| Collapse/fade nội bộ | 200ms |
| Modal/drawer | 300ms |

- Dùng easing chuẩn của Ant Design.
- Không animate layout lớn không có mục đích.
- Không dùng bounce hoặc motion trang trí trong workflow.
- Loading indicator không gây nhấp nháy khi request rất nhanh.

## 25. Vue component architecture

### 25.1 Phân loại

```text
src/
├── views/                 # Route-level composition
├── components/
│   ├── layout/            # AppShell, PageHeader, Sidebar
│   ├── common/            # Generic reusable primitives
│   ├── assets/            # Asset domain UI
│   ├── borrowing/         # Borrow domain UI
│   ├── repairs/           # Repair domain UI
│   └── users/             # User/RBAC UI
├── services/              # HTTP transport
├── stores/                # Shared application state
└── composables/           # Reusable stateful Vue behavior
```

### 25.2 View rules

View chịu trách nhiệm:

- route params/query;
- page-level fetch;
- ghép component;
- permission/state quyết định;
- navigation sau action.

View không nên:

- chứa toàn bộ markup table/form lặp lại;
- hard-code HTTP transport nếu service có thể sở hữu;
- định nghĩa token/màu riêng;
- chứa generic component có thể tái sử dụng.

### 25.3 Component rules

Component:

- có một trách nhiệm rõ;
- nhận dữ liệu bằng props;
- phát event thay vì tự điều hướng khi không cần;
- có loading/disabled/error behavior phù hợp;
- không import store toàn cục nếu prop/event đủ;
- không bọc mọi thứ trong card mặc định.

### 25.4 Ant Design mapping

Khi Ant Design Vue được cài và chuẩn hóa, ưu tiên:

| Pattern | Component family |
|---|---|
| App shell | Layout, Sider, Header, Content |
| Navigation | Menu, Breadcrumb, Dropdown |
| List data | Table, List, Pagination |
| Form | Form, Input, Select, DatePicker, Radio, Checkbox |
| Actions | Button, Popconfirm |
| Status | Tag, Badge, Alert |
| Overlay | Modal, Drawer, Tooltip, Popover |
| Feedback | Message, Notification, Result, Empty, Skeleton |
| Detail | Descriptions, Tabs, Timeline |

Không copy API React từ `DESIGN.md` vào Vue. Theme/config phải dùng API tương ứng
của phiên bản Ant Design Vue được project chọn.

## 26. Component inventory

### 26.1 Core reusable components bắt buộc

#### Foundation

- design tokens;
- typography utilities;
- spacing/layout primitives;
- responsive helpers;
- focus styles.

#### Layout

- `AppShell`;
- `AuthLayout`;
- `PageHeader`;
- `PageContent`;
- `SidebarNavigation`;
- `UserMenu`;
- `ActionBar`.

#### Common data

- `DataTable`;
- `DataToolbar`;
- `StatusTag`;
- `EmptyState`;
- `ErrorState`;
- `LoadingState`;
- `PermissionGate`;
- `ConfirmAction`.

### 26.2 Domain component candidates

Chỉ tạo component domain khi screen/flow được chốt thật sự cần tái sử dụng; các
tên dưới đây không phải feature scope hoặc danh sách component bắt buộc.

- `AssetStatusTag`;
- `AssetSummary`;
- `BorrowRequestStatusTag`;
- `BorrowRequestTable`;
- `RepairStatusTag`;
- `UserRoleList`;
- `RoleSelectionCard`;
- `PermissionMatrix` chỉ dùng khi product scope thật sự cần hiển thị ma trận
  quyền; không suy ra là bắt buộc từ thao tác gán/gỡ role có sẵn.

Tên cụ thể có thể thay đổi theo convention code, nhưng trách nhiệm component phải
giữ tương đương.

## 27. Anti-patterns bị cấm

- Sidebar/header kết cấu màu green, teal, blue, dark hoặc full orange.
- Nhiều primary button trong cùng một region.
- Gradient/glassmorphism/neon.
- Card lồng card không có boundary nghiệp vụ.
- Card cho từng table row trên desktop.
- H1 quá 24px trong authenticated app.
- Control cao ngẫu nhiên 30/34/36/44px.
- Avatar lúc ở header, lúc ở đáy sidebar.
- Status chỉ có màu, không có text.
- Role card có selected border/background nhưng checkbox hoặc radio vẫn
  unchecked.
- Dùng error red cho badge `Toàn quyền` hoặc permission metadata không phải lỗi.
- Dùng orange/pink cho placeholder hoặc icon control ở trạng thái mặc định.
- Form readonly dùng disabled input thay description list.
- Icon action không có accessible label.
- View gọi `fetch` trực tiếp khi service nên sở hữu endpoint.
- Menu dựa trên role name hard-code thay vì permission mapping.
- UI hiển thị feature backend chưa hỗ trợ như thể đã hoạt động.
- One-off CSS hex lặp lại thay vì token.
- Sticky/fixed element che pagination hoặc action.
- Hidden drawer làm page overflow.

## 28. Screen review checklist

### Structure

- [ ] Đúng AppShell và permission-aware navigation.
- [ ] Avatar/user identity ở top-right header.
- [ ] Page có đúng một H1.
- [ ] Primary task xuất hiện trong viewport đầu.
- [ ] Main content dùng đúng template.
- [ ] Không lồng card không cần thiết.

### Visual

- [ ] Dùng token đã quy định.
- [ ] Không có structural green/teal/blue/dark.
- [ ] Control 32px, radius 6px; surface radius 8px.
- [ ] Chỉ một primary action mỗi region.
- [ ] Status dùng semantic color đúng nghĩa.
- [ ] Placeholder và icon control dùng đúng neutral/interaction token.
- [ ] Permission badge không dùng error color nếu không biểu đạt lỗi.
- [ ] Typography và spacing theo scale.

### Data and behavior

- [ ] Có loading, empty, error, forbidden và success.
- [ ] Permission và state điều khiển action đúng.
- [ ] Selection card và checkbox/radio phản ánh cùng một state.
- [ ] Mutation chống double submit.
- [ ] Destructive action có confirmation.
- [ ] Filter/pagination không làm mất context.
- [ ] Long text và dữ liệu thiếu được xử lý.

### Responsive

- [ ] Desktop không clipping.
- [ ] Tablet toolbar wrap hợp lý.
- [ ] Mobile giữ navigation và primary action.
- [ ] Table có chiến lược mobile rõ.
- [ ] Modal/drawer không vượt viewport.

### Accessibility

- [ ] Keyboard dùng được.
- [ ] Focus visible.
- [ ] Form có label và error association.
- [ ] Selection group có semantics, focus order và keyboard toggle đúng.
- [ ] Icon-only action có accessible name.
- [ ] Màu không phải tín hiệu duy nhất.
- [ ] Contrast đạt yêu cầu.

## 29. Definition of done cho component

Một component chỉ được coi là hoàn thành khi:

1. dùng token thay vì one-off style;
2. có default, hover, focus, active, disabled và loading state khi phù hợp;
3. có API props/events rõ;
4. hoạt động với keyboard và screen reader ở mức cần thiết;
5. không vỡ với label/dữ liệu dài;
6. responsive theo container;
7. có ví dụ sử dụng;
8. được dùng nhất quán ở ít nhất một workflow thật;
9. build frontend pass;
10. review theo checklist của tài liệu này.

## 30. Quy trình mở rộng Design System

Khi cần component/pattern chưa có:

1. xác định use case và role;
2. kiểm tra Ant Design đã có pattern tương đương chưa;
3. kiểm tra component BigIn hiện có;
4. đề xuất token/state/responsive/accessibility;
5. triển khai pilot ở một screen;
6. review visual và workflow;
7. cập nhật `DESIGN_SYSTEM.md`;
8. mới áp dụng rộng.

Không tạo pattern mới chỉ vì một screen “trông khác” trên mockup.
