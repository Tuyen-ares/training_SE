# Frontend Context

## Mục tiêu

Frontend MVP giúp user được cấp quyền quản lý asset, mượn–duyệt–bàn giao–trả, xử lý issue/sửa chữa, theo dõi notification và quản trị user. Tài liệu này chuyển requirement đã chốt thành cấu trúc giao diện có thể review trước khi viết screen spec, API contract hoặc code.

## Baseline và giới hạn

- Frontend dự kiến dùng Vue 3 và Ant Design.
- `DESIGN_SYSTEM.md` và `DESIGN.md` quyết định visual convention; Stitch chỉ là visual reference.
- Backend, API contract, database và migration chưa thuộc task này.
- Code/route hiện tại có registration và menu theo role cũ. Registration đã được chốt lại là yêu cầu chờ xét duyệt; menu theo role cũ vẫn chỉ là implementation/reference cũ, không phải nguồn nghiệp vụ.

## Quyết định frontend đã chốt

- Có **một Dashboard chung** sau đăng nhập, không có Employee/Manager/Admin dashboard riêng.
- Dashboard chỉ hiện widget hoặc shortcut đến nghiệp vụ mà user có permission. Nó không tạo KPI, analytics hoặc workflow mới.
- Permission thực tế là hợp của permission từ mọi role của user; không có hierarchy `Admin > Manager > Employee`.
- Sidebar và action hiển thị theo permission/capability, không theo tên role.
- Một screen có thể phục vụ nhiều User Story; một User Story có thể dùng nhiều screen.
- Trạng thái `PENDING`, `APPROVED`, `REJECTED`, `RESERVED`, `BORROWED`, `DAMAGED`, `IN_REPAIR`, `RETIRED` phải bám theo Business Rule, không suy diễn transition mới ở frontend.

## Table/List UI Standard — Active MVP

Các màn hình có dữ liệu dạng list/table trong production frontend dùng cùng một
table foundation. Foundation này giữ Ant Design Vue làm renderer hiện tại,
nhưng chuyển các quyết định lặp lại ra khỏi từng page.

### Table foundation

`apps/frontend/src/components/common/AppTable.vue` là abstraction chuẩn cho
table/list. Page vẫn sở hữu domain columns, cell renderer và action handler;
`AppTable` sở hữu presentation và interaction dùng chung:

- cell/header spacing, typography, border, hover và row density;
- loading state, empty state và pagination footer theo một layout nhất quán;
- row key, table surface, keyboard/focus behavior và touch-target convention;
- responsive mode, intentional horizontal scroll và fixed-column behavior;
- forwarding các Ant Design table slots để không duplicate business rendering.

Các token table dùng chung nằm trong `apps/frontend/src/assets/tokens.css`:

```css
--bigin-table-cell-padding-y: 12px;
--bigin-table-cell-padding-x: 16px;
--bigin-table-header-padding-y: 12px;
--bigin-table-header-padding-x: 16px;
--bigin-table-action-compact-width: 112px;
--bigin-table-action-normal-width: 144px;
--bigin-table-action-wide-width: 224px;
```

Page không tự đặt lại padding row/header (ví dụ 10px, 14px, 17px hoặc 18px)
trừ khi có một lý do accessibility hoặc domain đã được ghi rõ trong screen
spec. Error/forbidden state vẫn do page xử lý vì cần giữ permission và retry
context; loading, empty và pagination presentation được foundation chuẩn hóa.

Pagination server-side dùng cùng footer gồm summary và `a-pagination`, giữ
`current`, `pageSize`, `total` từ API và không thay đổi API/backend. Table không
có pagination thật sự (ví dụ catalog đã tải toàn bộ dữ liệu) vẫn dùng cùng
surface và spacing nhưng không render footer giả.

### Action column convention

- Title luôn là `Action` (số ít), đặt ở cuối bảng.
- Nội dung trong row căn phải (`align="right"`); label `Action` trong header căn
  giữa ô header để thẳng hàng với vùng thao tác mà không làm thay đổi vị trí
  các control trong row.
- Width dùng semantic size `compact`, `normal` hoặc `wide`, được map qua token;
  page không chọn width chỉ vì một con số tùy ý.
- `fixed="right"` chỉ dùng khi bảng có intentional horizontal scroll hoặc
  sticky action thực sự giúp hoàn tất thao tác; không bắt buộc cho mọi table.
- Action controls giữ loading/disabled state hiện tại và touch target tối thiểu
  trên coarse pointer. Permission/business transition không được chuyển vào
  foundation.
- Row action phổ biến như View/Edit hiển thị icon chuẩn đi trước verb label và
  dùng info blue text token để dễ nhận diện; Asset List luôn hiển thị `View` và
  `Edit` dạng icon + text, không dùng icon-only làm presentation mặc định.

Nếu cần dựng column action từ nhiều page, có thể dùng helper dùng chung, nhưng
helper chỉ chuẩn hóa presentation/semantic size; action handler và permission
vẫn nằm ở page.

### Column design và responsive strategy

Không dùng `overflow-x: hidden` để che overflow. Column được thiết kế theo thứ
tự ưu tiên:

1. Cho column chính co giãn hợp lý trong vùng nội dung.
2. Gom metadata mang tính mô tả vào cell chính, đặt dưới/bên cạnh identifier.
3. Ở breakpoint nhỏ hơn, ẩn hoặc chuyển metadata ít quan trọng vào dòng phụ.
4. Nếu field quan trọng không thể gom mà vẫn cần so sánh, dùng horizontal scroll
   có chủ đích và giữ header/action alignment.
5. Mobile ưu tiên stacked row/card representation; mobile renderer reuse cell
   formatter/action hiện có thay vì nhân đôi business logic. Nếu một bảng cần
   so sánh nhiều field và card làm mất ngữ cảnh, intentional horizontal scroll
   là fallback hợp lệ.

`scroll.x = 'max-content'` không phải default của foundation và không được copy
cho mọi table. Mỗi exception phải có lý do trong screen implementation (field
quan trọng không thể gom hoặc workflow action cần alignment).

### Canonical Asset Identity

Các renderer asset dùng cùng canonical shape ở frontend, không tự đọc nhiều DTO
shape khác nhau trong từng view:

```js
{
  modelName: string | null,
  assetCode: string | null,
  serialNumber: string | null,
  imageUrl: string | null
}
```

Presentation order là:

```text
Model name
Code: <assetCode>
Seri: <serialNumber>
```

Giá trị thiếu hiển thị `—`. Không dùng `serialNumber || qrCode`, raw `qrCode`,
internal asset id hoặc synthetic `Asset #<id>` làm identity fallback. `qrCode`
vẫn được giữ trong API và chỉ render trong QR scan/lookup/generation/drawer hoặc
interaction chuyên biệt về QR.

Renderer được phép chọn primitive phù hợp: `normalizeAssetIdentity`, shared
formatter hoặc `AssetIdentity.vue`. Static audit chỉ yêu cầu một trong các
primitive này được dùng; không ép select, dashboard hoặc detail metadata phải
dùng Vue component nếu formatter/normalizer phù hợp hơn.

#### Screen exceptions

- **Asset List:** cell Asset chỉ hiển thị Model + Code. Category, Brand và Seri
  vẫn là ba column riêng để so sánh inventory; không lặp Seri trong Asset
  cell.
- **Asset Detail:** dedicated fields hiện có tiếp tục hiển thị Model, Code và
  Seri. Shared identity component không được chèn vào cùng khu vực nếu tạo lặp;
  normalizer chỉ cấp dữ liệu cho các field hoặc context không trùng.
- **Dashboard Recent Activity:** giữ nguyên các column hiện tại và chỉ chuẩn hóa
  giá trị identity. Không merge, remove, reorder hoặc redesign column. Loại bỏ
  QR và fallback `Asset #<detailId>`.
- **Borrow Request Create:** API `GET /assets` đã có `assetCode`. Option hiện
  tại là `model.name · (serialNumber || qrCode)`; selected row hiện
  `model + brand + (serialNumber || "Not assigned")` và chưa có Code. Cả hai
  phải chuyển sang shared formatter/normalizer; không dùng QR fallback và thiếu
  value hiển thị `—`, nhưng giữ nguyên selected id, validation và submit payload.

### Runtime verification matrix

Runtime review phải kiểm tra độc lập các context sau:

| Context | Viewport target | Acceptance |
| --- | --- | --- |
| Desktop rộng | 1440×900 | Table/list identity, pagination, action và toolbar không bị cắt hoặc lệch |
| Desktop có sidebar | 1280×800 với persistent sidebar 248px (`>=992px`) | Content region còn đủ rộng; không có header/body desync, action bị đẩy khỏi khung hoặc identity bị truncate bất ngờ |
| Tablet | 834×1112 và 768×1024 với navigation drawer (`<992px`) | Drawer/backdrop hoạt động; toolbar wrap; table chuyển renderer/scroll có chủ đích; Code/Seri vẫn đọc được |
| Mobile | 390×844 | Stacked row/card, touch target, missing value `—` và QR action/drawer hoạt động |

Mỗi context phải thử: đủ Model + Code + Seri; thiếu Code; thiếu Seri; thiếu cả hai;
model dài; không có image; nhiều asset trong một request. Không nghiệm thu bằng
cách che overflow; không được có `undefined`, label rỗng hoặc raw QR trong asset
identity.

### Screen-specific column decisions

Các screen sau dùng cùng visual foundation nhưng không ép cùng một column layout:

| Screen | Giữ/hiển thị chính | Gom hoặc giảm tải |
| --- | --- | --- |
| Asset List | Asset (model/code), Category, Brand, Serial Number, Department, Status và Action; filter hiện có tiếp tục hoạt động | Category, Brand và Serial Number là column riêng để so sánh giữa các row; không hiển thị `qrCode` trong list, QR chỉ còn ở flow Scan QR hoặc Asset QR action |
| Asset Detail | Asset code, serial number, category, brand, model, department, status và permission-based actions | Không lặp raw `qrCode` trong descriptions; nút `Asset QR` mở QR label drawer với image/download/print |
| Asset Catalog | Mỗi tab Brands, Asset Types, Asset Models giữ field dùng để nhận diện và edit | Không ép cùng số cột/width giữa các tab; cùng spacing/header/pagination/action |
| Approval Queue | Request, requester, asset count, expected return, status, Action | Requester/department và request metadata hiển thị theo dòng phụ khi phù hợp |
| Handover | Asset (model/serial), request context, expected return, approved by, Action | Request ID + requester/department gom vào request cell; không hiển thị QR trong operational list |
| Return | Asset (model/serial), borrower, borrowing/expected-return context, Action | Borrow time và expected-return có thể nằm cùng borrowing cell trên breakpoint nhỏ; không hiển thị QR |
| Asset Issues | Issue/asset, reporter, status, handler, Action | Issue ID + reported date và mô tả ngắn gom vào cell issue |
| Borrowing Activity | Asset (model/serial), borrower theo permission, borrowing window, status/condition, Action | Không hiển thị QR; các mốc thời gian liên quan chỉ gom khi không cần so sánh từng cột |
| Users | User code/name/status và các field hỗ trợ search | Email/phone hiển thị dưới identity; không hiển thị password/hash |
| Vendors | Vendor, Contact name, Phone, Email, Address, Status và Action | Contact/address fields giữ thành column riêng vì là thông tin quản trị và thường xuyên cần so sánh; bảng dùng intentional scroll khi cần |
| My Borrow Requests | Request, Created timestamp, Assets, Approved, Rejected, Status và Action | Request identifier và thời gian tạo là hai column riêng; mobile có thể xếp thành hai dòng |
| Registration-related lists | Applicant, status, submitted date, Action | Email/phone hiển thị dưới applicant identity |

Các field đang được sort/filter hoặc thường xuyên so sánh giữa nhiều row không
được gom chỉ để giảm số cột. Mọi thay đổi trên đây chỉ là presentation; data
fetch, query/filter semantics, permission và business transitions giữ nguyên.

### Asset Catalog consistency

Brands, Asset Types và Asset Models dùng `AppTable` cùng tokens, header
typography, empty/loading state, pagination convention và Action alignment.
Tabs được phép có width, field và số column khác nhau theo semantics; không dùng
width giả tạo để làm ba tab trông có cùng số cột.

### Review matrix

Migration phải review tối thiểu `Asset List`, `Asset Catalog`, `Approval Queue`,
`Handover`, `Return`, `Asset Issues`, `Borrowing Activity`, `My Borrow Requests`,
`Users`, `Vendors`, `Registration Requests`, `Roles` và `Departments`. Không thay
đổi backend/API, business logic hoặc permission logic trong migration này.

## Cấu trúc source hiện tại

Production frontend giữ các thư mục boilerplate cấp cao dưới
`apps/frontend/src/`. Route-level views được nhóm theo domain; service module
được nhóm theo domain nhưng vẫn giữ nguyên export và HTTP behavior hiện tại.

```text
src/
├── assets/ components/ constants/ router/ stores/ utils/
├── services/
│   ├── administration/ assets/ asset-issues/ borrowing/
│   └── notifications/ vendors/
└── views/
    ├── auth/ dashboard/ administration/ assets/
    ├── borrowing/ asset-issues/ vendors/ notifications/

training/frontend-vue/
├── README.md
├── examples/
└── components/
```

Training examples are outside `apps/frontend/src`; production routes must not
import from `training/**`.

## Discrepancy quan trọng với nguồn cũ

| ID | Nguồn cũ | Baseline frontend MVP |
| --- | --- | --- |
| FD-01 | Stitch có 3 dashboard theo role. | Một dashboard chung, widget theo permission. |
| FD-02 | `AUTH-02` hỗ trợ registration trực tiếp. | Registration tạo yêu cầu `PENDING`; reviewer có permission xét duyệt mới cấp account, role và department. |
| FD-03 | Một số screen duyệt ở header hoặc coi duyệt là bàn giao. | Duyệt theo detail; bàn giao/hoàn trả xác định qua borrow history. |
| FD-04 | Stitch có CRUD department, role và permission. | Có Department Management cho list/create/update/status theo permission; vẫn không có CRUD role/permission hoặc delete department. |
| FD-05 | Repair có nhiều page bước riêng. | Issue Detail giữ context; các bước repair là workflow state, không buộc thành page riêng. |

## Kết quả cần có trước implementation

1. Review và xác nhận Screen Inventory.
2. Chốt cách biểu diễn các điểm chưa quyết định trong Frontend Open Questions.
3. Cập nhật Stitch theo inventory đã được duyệt.
4. Chỉ sau đó mới lập API contract, screen spec chi tiết và implement.
