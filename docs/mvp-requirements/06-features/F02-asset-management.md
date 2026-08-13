# F02 – Asset Management

## Mục tiêu

Duy trì thông tin nhận diện, phân loại, department quản lý và trạng thái đáng tin cậy của asset.

## Actors

Nhân viên; User có permission quản lý asset.

## User Stories

- US-F02-01 – Xem danh sách asset.
- US-F02-02 – Xem chi tiết asset.
- US-F02-03 – Xem asset có thể yêu cầu mượn.
- US-F02-04 – Tạo asset.
- US-F02-05 – Cập nhật asset.
- US-F02-06 – Quản lý danh mục asset.
- US-F02-07 – Ngừng sử dụng asset.
- US-F02-08 – Tra cứu asset bằng QR.

## Business Rules áp dụng

`BR-AST-01..10`, `BR-RBAC-01..03`.

## Functional Requirements liên quan

`FR-F02-01..09`.

## Dependencies

F01; departments; brands; asset types; asset models.

## Out of Scope

Kiểm kê QR, location, asset history, lịch chuyển department, procurement.

QR trong MVP chỉ là mã định danh bất biến được sinh khi tạo asset. Payload là
`{VITE_PUBLIC_APP_URL}/qr/{qr_code}`; việc quét camera thuộc màn hình Asset QR
Scan riêng và không tạo bản ghi kiểm kê hay thay đổi trạng thái asset.
