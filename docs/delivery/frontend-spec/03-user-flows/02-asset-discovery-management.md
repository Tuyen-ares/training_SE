# FLOW-02 – Tra cứu và chọn asset

## Goal

Tìm asset, xem chi tiết hoặc chọn asset AVAILABLE cho nhu cầu mượn.

## Actor

User có permission xem asset; nhân viên khi tạo phiếu.

## Related User Stories

`US-F02-01..03`, `US-F02-08`, `US-F03-01`.

## Preconditions

User đã đăng nhập và có permission xem asset.

## Main Flow

1. User mở `SCR-F02-01` từ navigation, Dashboard hoặc Create Borrow Request.
2. User search/filter danh sách hoặc quét/nhập QR.
3. Hệ thống hiển thị asset phù hợp; selection mode chỉ cho phép chọn `AVAILABLE`.
4. User mở `SCR-F02-02` để xem định danh, model, department, QR và status.
5. Nếu đang tạo phiếu, user chọn asset rồi trở về `SCR-F03-01` với selection đã giữ trong form.

## Alternative Flows

- QR hợp lệ dẫn trực tiếp tới Asset Detail.
- User có permission phù hợp mở Asset Form hoặc Catalog từ khu vực asset.

## Error / Invalid States

- QR/asset không tồn tại: `SCR-SYS-02` ở trạng thái not-found.
- Asset không AVAILABLE: vẫn có thể được xem khi có quyền nhưng không chọn được cho phiếu mới.
- Thiếu permission xem: forbidden, không hiển thị thông tin asset.

## Result

User tìm được asset đúng hoặc có selection hợp lệ; QR không tạo inventory session và không đổi status.

## Related Screens

`SCR-F02-01`, `SCR-F02-02`, `SCR-F03-01`, `SCR-SYS-02`.

# FLOW-03 – Quản lý asset và danh mục

## Goal

Tạo/cập nhật asset, catalog hoặc ngừng sử dụng asset khi user có thẩm quyền.

## Actor

User có permission quản lý asset/catalog.

## Related User Stories

`US-F02-04..07`.

## Preconditions

User có permission tương ứng; các reference model/department tồn tại khi được chọn.

## Main Flow

1. User mở Asset Form từ Asset List/Detail hoặc Asset Catalog từ navigation.
2. User nhập/cập nhật dữ liệu asset hoặc catalog.
3. Hệ thống validate QR, serial, model, department và các ràng buộc liên quan.
4. User lưu; screen phản ánh dữ liệu mới.
5. Với retire, user khởi động action từ Asset Detail, xem impact và xác nhận.

## Alternative Flows

- Asset Form dùng cùng surface cho create và edit.
- Catalog đổi tab brand/type/model; chỉ tạo/cập nhật, không cung cấp delete flow.

## Error / Invalid States

- QR/serial trùng hoặc reference không tồn tại: field/global validation, không lưu dữ liệu sai.
- Retire với asset RESERVED/BORROWED: action bị chặn và giải thích trạng thái.
- Thay đổi status vận hành không thực hiện trong update form thông thường.

## Result

Asset/catalog cập nhật hợp lệ hoặc giữ nguyên dữ liệu cũ khi validation/thẩm quyền thất bại.

## Related Screens

`SCR-F02-01`, `SCR-F02-02`, `SCR-F02-03`, `SCR-F02-04`.
