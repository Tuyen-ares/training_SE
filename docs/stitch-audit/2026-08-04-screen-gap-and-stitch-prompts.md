# Screen còn thiếu, screen cần chỉnh và prompt Stitch

**Ngày audit:** 04/08/2026  
**Mục đích:** giúp kiểm tra và chỉnh prototype Stitch trước khi chuyển giao diện sang tiếng Anh.  
**Phạm vi:** chỉ mô tả mockup. File này không thay đổi requirement, code, API, database hoặc screen trên Stitch.

## 1. Đọc nhanh: hiện trạng là gì?

Stitch hiện có **41 source screen**, **106 canvas instance** và **43 instance đang hiển thị**. Nhưng MVP chỉ có **18 logical screen/template** theo [Screen Inventory](../delivery/frontend-spec/02-screen-inventory.md).

Vì vậy, không phải mọi screen đang thấy trên canvas đều là screen MVP cần hoàn thiện hoặc dịch tiếng Anh. Có screen mới/canonical, screen cũ làm reference, screen trùng và screen đã ngoài scope.

### Cách hiểu các từ trong file này

| Từ | Nghĩa đơn giản |
| --- | --- |
| **Canonical screen** | Bản screen nên được dùng làm bản chính của MVP. |
| **Reference screen** | Bản cũ giữ lại để xem layout/ý tưởng; không phải luồng MVP chính. |
| **Logical screen** | Một loại màn hình theo spec. Một logical screen có thể có nhiều mockup hoặc trạng thái nhỏ. |
| **Workflow state** | Trạng thái hiển thị trong một screen, ví dụ reject, trả hỏng; không nhất thiết là page riêng. |
| **Permission** | Quyền thực tế của user. Không suy luận quyền chỉ từ tên role như Admin hoặc Manager. |

## 2. Kết luận trước khi dịch sang tiếng Anh

**Chưa nên dịch tất cả 43 canvas instance.** Nếu làm vậy sẽ dịch cả dashboard theo role, RBAC CRUD, Department management, Registration và các bản trùng.

Nên ưu tiên theo thứ tự:

1. Chốt/correct các screen MVP bên dưới.
2. Chọn rõ screen nào là canonical để dịch.
3. Dịch **các canonical screen** sang tiếng Anh.
4. Chỉ dịch reference screen khi thật sự cần trình bày chúng.

## 3. Screen còn thiếu hoàn toàn

### 3.1 Bàn giao và nhận trả — tái dùng BOR-09, không tạo screen mới

**Theo spec:** `SCR-F05-01`  
**Screen tái sử dụng:** `BOR-09 — Trả thiết bị`  
**Quyết định chốt:** không tạo Fulfillment Queue riêng. Mở rộng `BOR-09` thành screen chung cho bàn giao và nhận trả.

`BOR-09` đang giải quyết tiếp nhận tài sản khi nhân viên trả. Screen này sẽ được mở rộng để thể hiện thêm bước rất quan trọng ở trước đó:

`APPROVED` → asset `RESERVED` → **xác nhận bàn giao** → asset `BORROWED`.

Screen nên có hai tab hoặc hai nhóm rõ ràng:

- **Chờ bàn giao:** các thiết bị đã được duyệt và đang `RESERVED`.
- **Chờ nhận trả:** các lượt mượn đã bàn giao, asset đang `BORROWED`.

Người có permission bàn giao/nhận trả thao tác tại đây. Nhân viên mượn **không cần** xác nhận đã nhận thiết bị trong MVP hiện tại; họ chỉ xem phiếu và lịch sử của mình.

#### Prompt chỉnh BOR-09 thành screen dùng chung

```text
Chỉnh trực tiếp duy nhất screen BOR-09 — Trả thiết bị. Đổi title/label screen thành “BOR-09 — Bàn giao & nhận trả”. Không tạo screen mới.

Dùng AppShell BigIn hiện tại: sidebar trắng, header trắng, màu primary cam #FF6B00.
Không dùng tên role để quyết định menu hoặc action; chỉ ghi chú “hiển thị theo quyền được cấp”.

Đổi tiêu đề chính thành “Bàn giao & nhận trả” và thêm hai tab:

1. “Chờ bàn giao”: hiển thị các thiết bị đã được duyệt và đang ở trạng thái “Đã giữ chỗ”. Mỗi dòng có mã phiếu, người mượn, thiết bị, ngày dự kiến trả và nút “Xác nhận bàn giao”.
2. “Chờ nhận trả”: giữ lại giao diện nhận trả hiện có, gồm thông tin người trả, ngày mượn, danh sách thiết bị, lựa chọn “Tốt (Sẵn sàng)” hoặc “Hư hỏng”, ghi chú tình trạng và nút “Xác nhận trả thiết bị”.

Khi chọn tab “Chờ bàn giao”, chỉ hiển thị nội dung bàn giao; khi chọn tab “Chờ nhận trả”, chỉ hiển thị nội dung nhận trả. Không hiển thị cả hai form cùng lúc.
Không tạo KPI, biểu đồ, role dashboard, modal, screen hoặc nghiệp vụ mới.
```

### 3.2 Notification Center — trung tâm thông báo

**Theo spec:** `SCR-F07-01`  
**Hiện có:** bell icon trên một số header.  
**Thiếu:** screen xem danh sách thông báo, chưa đọc/đã đọc, và mở đối tượng liên quan.

Bell icon chỉ là điểm vào. Nó không thay thế screen Notification Center.

Screen cần cho user xem notification của chính họ. Thông báo có thể dẫn đến phiếu mượn, detail được duyệt/từ chối, issue, bàn giao hoặc hoàn trả. Người nhận phải theo permission/entity, không theo tên role hard-code.

> **Cần quyết định của người dùng trước khi tạo.** Đây cũng là screen mới.

#### Prompt tạo Notification Center — đã được phê duyệt tạo mới

```text
Tạo đúng một desktop screen mới tên: SCR-F07-01 — Notification Center.

Dùng AppShell BigIn hiện tại: sidebar trắng, header trắng, màu primary cam #FF6B00.
Tiêu đề: “Thông báo”. Header có bell icon nhất quán với các screen khác.

Ngay dưới tiêu đề có hai tab: “Chưa đọc” và “Tất cả”. Tab đang chọn có underline hoặc màu cam #FF6B00.

Hiển thị danh sách notification theo dạng từng dòng/card gọn, mỗi dòng gồm:
- icon loại thông báo;
- tiêu đề;
- nội dung ngắn tối đa hai dòng;
- thời gian;
- dấu/chip “Chưa đọc” khi notification chưa đọc;
- action text “Xem liên quan”.

Thêm action “Đánh dấu tất cả là đã đọc” ở góc phải phần danh sách.
Một notification chưa đọc dùng nền cam rất nhạt hoặc viền cam nhạt; notification đã đọc nền trắng/trung tính.

Chỉ hiển thị thông báo của user hiện tại. Không ghi tên role để quyết định người nhận.
Tạo empty state trong cùng screen với copy: “Bạn chưa có thông báo nào”.

Dùng dữ liệu minh họa thuộc các nhóm: yêu cầu mượn, phê duyệt, bàn giao/nhận trả và sự cố tài sản. Không tạo KPI, biểu đồ, role dashboard, setting notification, screen hoặc nghiệp vụ mới.

```

## 4. Screen MVP hiện có nhưng chưa ổn

## 4.1 AUTH-01 — Đăng nhập

**Canvas/source hiện tại:** `AUTH-01 — Đăng nhập` / `db352461…`  
**Điểm tốt:** hiện có đúng hai field Email và Mật khẩu.

**Vấn đề:** vẫn có link `Chưa có tài khoản? Đăng ký ngay`.

MVP không có public registration. `AUTH-02 — Đăng ký` được giữ lại làm reference theo quyết định trước đó, nhưng Login không được dẫn user tới đó.

#### Prompt chỉnh AUTH-01

```text
Chỉnh trực tiếp duy nhất screen AUTH-01 — Đăng nhập. Không tạo screen mới.

Giữ nguyên layout login, Email, Mật khẩu, checkbox ghi nhớ và nút “Đăng nhập”.
Xóa dòng/link “Chưa có tài khoản? Đăng ký ngay”.
Không sửa hoặc xóa screen AUTH-02 — Đăng ký.
Không thay đổi màu sắc, bố cục hoặc thêm field mới.
```

## 4.2 System states — Not Found và Forbidden chưa dùng cùng một pattern-done

**Screen liên quan:** `SCR-SYS-02` Not Found và Forbidden.

Not Found hiện dùng Result layout rộng, còn Forbidden hiện dùng một card nhỏ ở giữa. Cả hai đều đúng nội dung an toàn, nhưng chưa giống nhau như một shared system pattern.

#### Prompt chỉnh Forbidden

```text
Chỉnh trực tiếp duy nhất screen SCR-SYS-02 — Access & Resource Result: Forbidden — BigIn Asset.

Giữ nội dung an toàn: “Bạn không có quyền truy cập” và không hiển thị tên hay dữ liệu của tài nguyên bị chặn.
Đổi bố cục Result để đồng bộ với screen Not Found: AppShell trắng, vùng Result căn giữa rộng rãi, icon, tiêu đề, mô tả ngắn, nút primary “Về tổng quan” và nút secondary “Quay lại”.
Không đổi sang sidebar xanh hoặc teal. Primary vẫn là cam #FF6B00.
Không tạo screen mới.
```

## 4.3 AST-03 — Chi tiết thiết bị - done

**Điểm tốt:** có thông tin asset, trạng thái, department và related borrowing records.

**Vấn đề wording:**

- `Báo hỏng` quá hẹp; issue có thể là sự cố cần xử lý, không chỉ hỏng.
- `Thu hồi` dễ bị hiểu nhầm là thu hồi phiếu mượn. Nếu action này là retire asset thì wording nên là `Ngừng sử dụng`.

Tab `Lịch sử mượn` có thể giữ nếu chỉ hiển thị borrowing records liên quan đến asset; không biến nó thành module Asset History độc lập.

#### Prompt chỉnh AST-03

```text
Chỉnh trực tiếp duy nhất screen AST-03 — Chi tiết thiết bị. Không tạo screen mới.

Đổi label action “Báo hỏng” thành “Báo sự cố”.
Đổi label action “Thu hồi” thành “Ngừng sử dụng”.
Giữ tab “Lịch sử mượn” chỉ như danh sách các lượt mượn liên quan đến thiết bị này; không thêm module lịch sử tài sản riêng.
Giữ nguyên bố cục, dữ liệu và các action khác.
```

## 4.4 AST-04 — Form tạo/cập nhật asset

**Vấn đề:** screen chưa có field ảnh asset, trong khi asset có `image_url` tùy chọn.

Status asset không được là field CRUD tự do. Screen hiện có `Trạng thái ban đầu: Sẵn sàng` là phù hợp nếu đây chỉ là thông tin read-only khi tạo mới.

#### Prompt chỉnh AST-04-done

```text
Chỉnh trực tiếp duy nhất screen AST-04 — Thêm thiết bị mới. Không tạo screen mới.

Trong phần “Thông tin chung”, thêm field tùy chọn có label “URL hình ảnh”.
Placeholder: “https://example.com/asset-image.jpg”.
Đặt field gần Serial Number hoặc trước phần “Trạng thái ghi nhận”.

Giữ “Trạng thái ban đầu: Sẵn sàng” là thông tin không chỉnh sửa được.
Không thêm dropdown để user tự chọn AVAILABLE, RESERVED, BORROWED, DAMAGED, IN_REPAIR hoặc RETIRED.
Không đổi bố cục khác.
```

## 4.5 AST-05 — Quản lý danh mục

**Vấn đề:** screen có icon xóa. MVP hiện chỉ chốt tạo/cập nhật Brand, Asset Type và Asset Model; chưa chốt delete.

#### Prompt chỉnh AST-05 - done

```text
Chỉnh trực tiếp duy nhất screen AST-05 — Quản lý danh mục. Không tạo screen mới.

Giữ các tab Thương hiệu, Loại thiết bị và Model thiết bị.
Giữ action thêm mới và icon chỉnh sửa.
Xóa toàn bộ icon hoặc action xóa danh mục/model khỏi từng dòng.
Không thêm dialog, modal, rule hoặc chức năng mới.
```

## 4.6 BOR-01 — Tạo yêu cầu mượn

**Điểm cần thể hiện rõ hơn:** asset được gửi vào phiếu vẫn chỉ là `PENDING`; gửi phiếu **không** giữ chỗ asset. Asset chỉ chuyển sang `RESERVED` khi một detail được duyệt.

Danh sách thiết bị đang chọn nên có chip `Sẵn sàng` để user biết đây là asset đủ điều kiện tại thời điểm chọn. Không để UI gợi ý rằng asset đã bị reserve ngay khi gửi yêu cầu.

#### Prompt chỉnh BOR-01-done

```text
Chỉnh trực tiếp duy nhất screen BOR-01 — Tạo yêu cầu mượn. Không tạo screen mới.

Trong mỗi dòng thiết bị đã chọn, thêm chip trạng thái xanh “Sẵn sàng”.
Thêm ghi chú ngắn, đặt gần nút “Gửi yêu cầu”: “Thiết bị chỉ được giữ chỗ sau khi được phê duyệt.”

Không hiển thị “Đã giữ chỗ” hoặc “Reserved” khi user chỉ mới gửi yêu cầu.
Giữ danh sách thiết bị, ngày dự kiến trả và nút Gửi yêu cầu hiện có.
```

## 4.7 BOR-08 — Xác nhận từ chối-done

Screen này đang là page riêng. Theo frontend spec, từ chối là workflow state của Borrow Request Detail, không phải một logical screen độc lập.

Không cần xóa ngay. Khi làm sạch canvas, nên đánh dấu nó là **reference/workflow state**, không coi như một screen MVP độc lập để dịch hay phát triển tiếp.

**Chưa cần prompt chỉnh** vì việc gộp/hide reference cần quyết định của người dùng.

## 4.8 BOR-09 — Trả thiết bị

**Điểm tốt:** đã có lựa chọn `Tốt (Sẵn sàng)` / `Hư hỏng`, note mô tả lỗi và footer mô tả asset hư hỏng tạo issue.

**Vấn đề còn lại:** khi chọn `Hư hỏng`, style đang quá nhạt và giống trạng thái chưa chọn. User dễ không biết mình đã chọn gì.

#### Prompt chỉnh BOR-09-done

```text
Chỉnh trực tiếp duy nhất screen BOR-09 — Trả thiết bị. Không tạo screen mới.

Chuẩn hóa trạng thái lựa chọn cho từng thiết bị:
- Khi chọn “Tốt (Sẵn sàng)”: icon, chữ và viền xanh #52C41A; nền xanh nhạt #F6FFED.
- Khi chọn “Hư hỏng”: icon, chữ và viền đỏ #FF4D4F; nền đỏ nhạt #FFF2F0.
- Lựa chọn chưa chọn: nền trắng, viền xám #D9D9D9, chữ/icon xám trung tính.

Giữ màu cam #FF6B00 chỉ cho nút primary “Xác nhận trả thiết bị”.
Không thay đổi danh sách thiết bị, footer hoặc bố cục.
```

## 4.9 BOR-10 — Lịch sử mượn toàn hệ thống

Screen có instance trên canvas nhưng Stitch MCP hiện không trả thumbnail cho source này. Vì vậy chưa thể xác nhận trực quan nội dung hiện tại.

Trước khi dịch, cần mở trực tiếp screen này và kiểm tra:

- Có phân biệt asset đang mượn và lịch sử đã trả.
- User chỉ xem dữ liệu trong phạm vi permission của họ.
- Có filter hợp lý và link đến request/asset khi được phép.
- Không biến nó thành một Asset History module riêng.

**Chưa đưa prompt chỉnh** vì chưa đủ bằng chứng visual để chỉ định thay đổi chính xác.

## 4.10 REP-01 đến REP-05 — Asset Issues & Repair

**Vấn đề chính:** nhóm screen vẫn gọi là `Sửa chữa`/`Repair`, trong khi requirement hiện là `Asset Issues` có thể bắt đầu bằng báo sự cố, xác nhận hoặc từ chối, sau đó mới sửa chữa.

Các trạng thái cần phản ánh trong giao diện:

`REPORTED` → `CONFIRMED` hoặc `REJECTED` → `IN_REPAIR` → `COMPLETED` hoặc `FAILED`.

Ngoài ra có `CANCELLED`. Không được làm cho issue vừa `REPORTED` đã tự chuyển asset sang hỏng hoặc đang sửa.

Hiện trạng cần chỉnh:

- `REP-01` mới có ngôn ngữ/tabs sửa chữa, chưa bao phủ lifecycle issue.
- `REP-02`, `REP-04`, `REP-05` là các transition page rời; theo spec nên là state/action trong Issue Detail.
- `REP-03` cần được dùng làm Asset Issue Detail chính.

#### Prompt chỉnh REP-01

```text
Chỉnh trực tiếp duy nhất screen REP-01. Không tạo screen mới.

Đổi tiêu đề “Danh sách sửa chữa” thành “Danh sách sự cố tài sản”.
Đổi item sidebar “Sửa chữa” thành “Sự cố & sửa chữa”.
Đổi các tab/filter trạng thái để thể hiện: Đã báo, Đã xác nhận, Đã từ chối, Đang sửa chữa, Hoàn tất, Thất bại, Đã hủy.

Giữ bảng danh sách, filter và action mở chi tiết.
Không thêm KPI, không tự chuyển trạng thái asset và không tạo thêm screen.
```

#### Prompt chỉnh REP-03 done

```text
Chỉnh trực tiếp duy nhất screen REP-03. Không tạo screen mới.

Đổi tiêu đề/wording từ “Chi tiết sửa chữa” thành “Chi tiết sự cố tài sản”.
Hiển thị rõ trạng thái issue hiện tại bằng badge.
Giữ thông tin thiết bị, người báo, người xử lý, mô tả và timeline.
Các action chỉ là các nút theo trạng thái đang hiển thị, ví dụ: “Xác nhận sự cố”, “Từ chối”, “Bắt đầu sửa chữa”, “Cập nhật sửa chữa”, “Hoàn tất”, “Ghi nhận thất bại”.

Không hiển thị tất cả action cùng lúc. Không tạo page transition mới.
```

## 4.11 USR-02 — Form user và role

**Vấn đề:** thiếu field `Avatar URL`. Wording `Toàn quyền` và mô tả capability theo tên role dễ làm user hiểu rằng hệ thống có role hierarchy.

MVP dùng flat RBAC: user có thể được gán/gỡ các role có sẵn, nhưng quyền thực tế là tổng permission được cấp.

#### Prompt chỉnh USR - done

```text
Chỉnh trực tiếp duy nhất screen USR-02 — Thêm người dùng mới. Không tạo screen mới.

Trong phần Thông tin cá nhân, thêm field tùy chọn “URL ảnh đại diện”.
Placeholder: “https://example.com/avatar.jpg”.

Trong phần chọn role, giữ danh sách role có sẵn nhưng xóa wording “Toàn quyền” và các mô tả ngụ ý role tự động có toàn bộ quyền.
Thêm ghi chú ngắn: “Quyền truy cập được xác định theo các permission của role được gán.”

Không tạo màn quản lý role/permission mới và không đổi bố cục khác.
```

## 5. Screen cũ/reference: không nên dịch như screen MVP chính

Các screen dưới đây có thể giữ trên canvas để tham khảo, nhưng không nên coi là source-of-truth hoặc ưu tiên dịch trước:

| Nhóm | Screen hiện có | Vì sao không phải MVP canonical |
| --- | --- | --- |
| Dashboard cũ | `DASH-01`, `DASH-02`, `DASH-03` | Chia theo Nhân viên/Quản lý/Admin; MVP dùng dashboard theo effective permission. |
| Registration | `AUTH-02` và biến thể cũ | Public registration ngoài scope. Giữ `AUTH-02` theo quyết định trước đó, nhưng không link từ Login. |
| RBAC CRUD | `RBAC-01`, `RBAC-02`, `RBAC-03` | MVP chỉ gán/gỡ role có sẵn trong User Form; không CRUD role/permission. |
| Department management | `DEP-01` | Department CRUD ngoài MVP. |
| Workflow page rời | `BOR-08`, `REP-02`, `REP-04`, `REP-05` | Nên được hiểu là workflow state/reference, không phải logical page mới. |

**Không xóa, hide, rename hoặc remap các screen này chỉ dựa vào file này.** Các thao tác đó cần được người dùng phê duyệt riêng.

## 6. Rủi ro design system trước khi dùng Stitch AI hàng loạt

Project-level design theme hiện vẫn có màu xanh teal cũ (`#246B59` / sidebar xanh), trong khi mockup BigIn canonical đang dùng cam `#FF6B00` và sidebar trắng theo `DESIGN.md`/`DESIGN_SYSTEM.md`.

Nếu prompt Stitch AI theo cụm lớn trước khi xử lý điểm này, AI có thể tạo lại màn hình theo theme teal và làm visual bị lệch.

Vì vậy:

- Không chạy prompt “chỉnh toàn bộ project” hoặc “dịch toàn bộ screen” trong một lần.
- Chỉ chọn một screen/cụm nhỏ cho mỗi prompt.
- Sau mỗi lần chỉnh: kiểm tra đúng source, thumbnail/canvas, title, nội dung, layout và màu.
- Nếu source state và canvas state khác nhau, dừng lại và báo discrepancy; không tự remap.

## 7. Thứ tự sửa đề xuất trước khi dịch tiếng Anh

1. `AUTH-01`, System Result và `BOR-09`: lỗi nhỏ, ít rủi ro.
2. `AST-03`, `AST-04`, `AST-05`, `USR-02`: wording/field/action scope.
3. `BOR-01`, nhóm `REP-*`, kiểm tra `BOR-10`: chốt workflow và lifecycle.
4. Quyết định có tạo `SCR-F05-01 Fulfillment Queue` và `SCR-F07-01 Notification Center` hay không.
5. Chọn danh sách canonical screen để dịch tiếng Anh.
6. Dịch từng screen/cụm nhỏ, kiểm tra visual ngay sau mỗi prompt.

## 8. Checklist sau từng prompt Stitch

- [ ] Chỉ đúng screen đã chọn thay đổi; không có screen mới ngoài dự kiến.
- [ ] Title/label không bị đổi nhầm.
- [ ] Canvas instance vẫn visible và thumbnail có nội dung đúng.
- [ ] Không overlap, không mất section, không vỡ sidebar/header.
- [ ] Màu semantic đúng: success xanh, warning vàng, error đỏ; cam chỉ là primary action/brand.
- [ ] Không dùng role name để quyết định quyền hiển thị action.
- [ ] Không tạo rule, API, database field hoặc workflow mới chỉ vì mockup.
