# Kế hoạch dọn project Stitch — BigIn Asset Management

Project ID: `11686200964836917081`  
Ngày đối chiếu: `2026-07-23`

## Quy ước

- **GIỮ:** dùng làm screen chuẩn. Codex chỉ tinh chỉnh nhẹ khi đồng bộ toàn hệ thống.
- **LÀM LẠI:** chức năng cần thiết nhưng AppShell, quyền, bố cục hoặc trạng thái hiện tại chưa đạt. Codex sẽ sửa qua Stitch MCP.
- **XÓA:** mobile, bản trùng, bản sai kích thước hoặc bản cũ đã có screen thay thế.

> Không xóa screen thuộc nhóm **LÀM LẠI** trước khi phiên bản sửa đã được kiểm tra. Stitch có thể tạo thêm phiên bản sau khi chỉnh sửa; chỉ xóa bản cũ sau khi xác nhận bản mới.

## Tổng kết

| Phân loại | Số lượng |
|---|---:|
| GIỮ | 13 |
| LÀM LẠI | 22 |
| XÓA | 29 |
| Tổng | 64 |

## 1. GIỮ — 13 screen

### Authentication

- `12759180225752119201` — **Đăng nhập - BigIn Asset**  
  Bản desktop chuẩn để làm mốc cho Login và Register.

### Staff

- `d5be8836e3a8479a9844ff5ed115a895` — **Tổng quan (Nhân viên) - Permission Audited**  
  Dashboard Staff chuẩn; menu theo role đã đúng.
- `eec50c26e9ec41d7b50bbc8380d6d2af` — **Chi tiết yêu cầu - BigIn Asset**  
  Giữ làm request detail chính.

### Asset Manager

- `661f9a37e12843cd84184d0c2635fd40` — **Tổng quan (Quản lý) - Permission Audited**  
  Dashboard Manager chuẩn; dùng AppShell này cho toàn bộ flow Manager.
- `2b6005fdf6764fd09aabe7302d31bf0e` — **Xác nhận từ chối - BigIn Asset**  
  Giữ như trạng thái dialog/component, không triển khai thành route độc lập.

### Admin

- `35f1ac4076fd4318bad3663b799c0eb7` — **Tổng quan (Admin) - BigIn Asset**  
  Dashboard Admin mặc định.
- `cd1308bdd8ba483880eb16cc7cfbd6be` — **Danh sách người dùng (Normalized) - BigIn Asset**  
  Danh sách người dùng chính.
- `b2918850323a4d788a4860561c6fd4f3` — **Chi tiết người dùng - BigIn Asset**
- `f10fa0e3dc1a496fa492c455858adc3d` — **Thêm người dùng mới (Normalized) - BigIn Asset**
- `f630032c037d40c7a20060c2bb2b1327` — **Chỉnh sửa người dùng - BigIn Asset**
- `579850b61b1d48858b9b8f35d28c076d` — **Quản lý phòng ban - BigIn Asset**
- `4cd8fafef9fb448eacd46976bb799618` — **Quản lý thiết bị (Admin) - BigIn Asset**

### Tài liệu

- `b0fe3279254b43f6bee47644a4a55f7e` — **BigIn Asset - Project Brief & PRD**  
  Giữ làm tài liệu tham chiếu; không tính là screen cần export.

## 2. LÀM LẠI — 22 screen

### Authentication

- `deb475171d4541019ead3f5409ee6e6b` — **Đăng ký - BigIn Asset**  
  Làm lại để dùng cùng bố cục, màu nền và nhận diện với Login chuẩn.

### Staff flow

- `82f192b321664ab49c220dcf490023be` — **Danh sách thiết bị (Nhân viên) - BigIn Asset**  
  Bỏ menu Sửa chữa, Danh mục và Quản trị; giữ catalog read-only.
- `ab0ab01ffe3143b093ad6a676d6c0804` — **Tạo yêu cầu mượn (Normalized) - BigIn Asset**  
  Thay bằng Staff AppShell; giữ form và summary.
- `7064ff7202b54f40aa8a192c33953bba` — **Yêu cầu của tôi (Normalized) - BigIn Asset**  
  Thay sidebar đúng Staff và chuẩn hóa bộ lọc/bảng.
- `50bd7588e31c4719875f3f8709bda2f7` — **Chi tiết yêu cầu (Chờ duyệt) - BigIn Asset**  
  Dùng cùng request-detail shell; giữ trạng thái chờ duyệt/hủy yêu cầu.
- `e213035ee7594a7d9992990ca5e0581e` — **Lịch sử mượn của tôi - BigIn Asset**  
  Bỏ toàn bộ chức năng Manager/Admin khỏi sidebar.

### Asset Manager flow

- `75ad50c84dc64f66992917633f410507` — **Hàng chờ phê duyệt (Normalized) - BigIn Asset**  
  Dùng AppShell của dashboard Manager đã audit.
- `dc8fa17b373d4eff8e69f3e2920871a8` — **Chi tiết phê duyệt - BigIn Asset**  
  Bỏ menu Quản trị; giữ hành động duyệt/từ chối và cảnh báo xung đột.
- `5d082a239cd74308963a4a5893e31af4` — **Trả thiết bị - BigIn Asset**  
  Chuẩn hóa AppShell, vùng kiểm tra tài sản và confirmation bar.
- `28f86634ee114fa99031a81b5ed70a2d` — **Chi tiết thiết bị - BigIn Asset**  
  Dùng Manager AppShell; giữ QR drawer như component state.
- `742f92ea3b844220af4d432f2aedb1ee` — **Danh sách sửa chữa (Normalized) - BigIn Asset**  
  Dùng Manager AppShell và chuẩn hóa trạng thái sửa chữa.
- `b3bcbaa151ab403bb070f7d2198ad2b3` — **Bắt đầu sửa chữa - BigIn Asset**  
  Làm lại hoàn toàn vì hiện chỉ có skeleton loading.
- `e04c6b1ee5194eb7ac04630dd052cb71` — **Chi tiết sửa chữa (Normalized) - BigIn Asset**  
  Thêm AppShell và thống nhất timeline/detail layout.
- `12634b90834840b0a5d7f1184746f0cd` — **Hoàn tất sửa chữa - BigIn Asset**  
  Giữ dưới dạng drawer/dialog state trên Repair Detail.
- `13255a2f350743cc846a31df92f0a5f4` — **Lỗi trạng thái sửa chữa - BigIn Asset**  
  Giữ error state nhưng đổi sang Manager AppShell.
- `24188868b44849459779ae63448d4261` — **Quản lý danh mục - BigIn Asset**  
  Bỏ quyền Admin khỏi shell; giữ thao tác danh mục cho Manager.
- `7cf91d95b0d74b19a7261a092d8eefa3` — **Thêm thiết bị mới - BigIn Asset**  
  Chuẩn hóa form và xác định đây là quyền Asset Manager.

### Admin flow

- `4bd295f66fff4b7d8ae4a1f3feb80b57` — **Lịch sử mượn toàn hệ thống (Normalized) - BigIn Asset**  
  Chuẩn hóa Admin AppShell và detail drawer.
- `4e535c2f7f04435493896149858818ab` — **Danh sách vai trò - BigIn Asset**  
  Đổi AppShell phụ sang Admin AppShell chuẩn.
- `0528ba3679bf4acd801899f3059dbfb1` — **Chi tiết vai trò & Phân quyền - BigIn Asset**  
  Chuẩn hóa permission matrix và hành động lưu.
- `d6d2690c53f54b259e9e393f66d72de1` — **Danh mục quyền hạn - BigIn Asset**  
  Dùng cùng thuật ngữ, sidebar và table style của Admin.
- `9c70ae25b6a14646b3614143876b5c08` — **Truy cập bị từ chối - BigIn Asset**  
  Làm thành forbidden state dùng chung, không gắn menu sai role.

## 3. XÓA — 29 screen

### Mobile — xóa toàn bộ 8 screen

- [x] `5875459278874659ae553ba2d2e2f0ab` — **Đăng nhập (Mobile) - BigIn Asset**
- [x] `1162fd664b3a4f12b88341e76cf0e0de` — **Tổng quan di động (Staff) - Permission Audited**
- [x] `01dcc0fa0a35485d98db2078e63b2135` — **Tổng quan di động & Trạng thái hệ thống - BigIn Asset**
- [x] `a1eb04917df64bcd9295002d8de33735` — **Danh mục thiết bị (Mobile) - BigIn Asset**
- [x] `9f231c3a96264242975488f4f0d3b04c` — **Danh sách thiết bị (Mobile) - States & A11y**
- [x] `f6aadb220e9d48199c41e60e1b300f28` — **Yêu cầu của tôi (Mobile) - BigIn Asset**
- [x] `f4a42478f0d14a2f93709bccc57d7b05` — **Hàng chờ phê duyệt (Mobile) - BigIn Asset**
- [x] `1a68339ab2124b819eff75c4f81d655e` — **Danh sách người dùng (Mobile) - BigIn Asset**

### Bản desktop sai frame hoặc sai hệ giao diện

- [x] `18f09ab6852c4aca9276067be0c3c029` — **Đăng nhập - BigIn Asset (Desktop)**  
  Gắn nhãn Desktop nhưng nằm trong frame 390px.
- [x] `6d1b76683bc349378bd3f65faf87fd2c` — **Danh sách thiết bị - BigIn Asset (Desktop)**  
  Desktop nhưng nằm trong frame 390px.
- [x] `0033694b348b489b80d3e9612edb8c2c` — **Danh sách người dùng - BigIn Asset (Desktop)**  
  Desktop nhưng nằm trong frame 390px và dùng hệ “Quản lý ND”.
- [x] `c9fca672de5e46b4b6d92f1ee5af5e7f` — **Hàng chờ phê duyệt - BigIn Asset (Desktop)**  
  Desktop nhưng nằm trong frame 390px và dùng shell khác.
- [x] `d99399fdaf7f460ab5141a100e94334b` — **Yêu cầu của tôi - BigIn Asset (Desktop)**  
  Dùng giao diện “ZenGallery”, không thuộc design system BigIn.

### Bản trùng hoặc bản cũ

- [x] `a5ae304b82224cefa8a39886a907ea40` — **Đăng nhập - BigIn Asset**  
  Xóa vì đã chọn `12759180225752119201` làm Login chuẩn.
- [x] `806e0d46c97d40a7b370b9c00f4c2008` — **Tổng quan (Nhân viên) - BigIn Asset**  
  Xóa vì đã có bản Permission Audited.
- [x] `7452764c1b5849aa92b80bce13d36739` — **Tổng quan (Quản lý) - BigIn Asset**  
  Xóa vì bản cũ lộ quyền Quản trị.
- [x] `2d5f3c50ab794a3f8a0345e19d621c63` — **Tổng quan (Admin) - Accessibility Audited**  
  Trạng thái accessibility/error sẽ gộp vào dashboard Admin chính.
- [x] `e768295d0979404d94f8738c757c907f` — **Tạo yêu cầu mượn - BigIn Asset**  
  Xóa vì giữ bản Normalized.
- [x] `37aff33a707a4d4b9f0de194bf5623e2` — **Yêu cầu của tôi - BigIn Asset**  
  Xóa vì giữ bản Normalized.
- [x] `1f58859c096c440a8b2b3ca2230d35dd` — **Hàng chờ phê duyệt - BigIn Asset**  
  Xóa vì giữ bản Normalized.
- [x] `aeafd6beca634ef1aa8913dfe45e44d2` — **Danh sách sửa chữa - BigIn Asset**  
  Xóa vì giữ bản Normalized.
- [x] `532e3a7e748a430db787b4b07edce31a` — **Chi tiết sửa chữa - BigIn Asset**  
  Xóa vì giữ bản Normalized.
- [x] `818606658dc74a61bbfd2314d68096c1` — **Danh sách người dùng - BigIn Asset**  
  Xóa vì giữ bản Normalized.
- [x] `8fa64e60594b4c5d860e05698731060c` — **Danh sách người dùng - Accessibility & States**  
  Gộp states vào screen người dùng chính.
- [x] `285f40c47a5f48a2a43eca534e6c3b7d` — **Thêm người dùng mới - BigIn Asset**  
  Xóa vì giữ bản Normalized.
- [x] `5f55699856574125af849b9267c4527c` — **Quản lý thiết bị - Accessibility & States**  
  Gộp states vào screen quản lý thiết bị chính.
- [x] `56461307b6a4415194a3857137f54df8` — **Lịch sử mượn toàn hệ thống - BigIn Asset**  
  Xóa vì giữ bản Normalized.

### Ảnh tham chiếu rời

- [x] `8078450079311818264` — **image.png**
- [x] `6478724857296491145` — **image.png**

## Thứ tự thực hiện đề xuất

1. Người dùng xóa 29 screen trong checklist **XÓA**.
2. Codex khóa Design System và ba AppShell chuẩn theo role.
3. Codex sửa nhóm Authentication + Staff.
4. Codex sửa nhóm Asset Manager.
5. Codex sửa nhóm Admin.
6. Kiểm tra lại toàn bộ canvas và chỉ xóa phiên bản cũ phát sinh sau khi đã xác nhận bản mới.
