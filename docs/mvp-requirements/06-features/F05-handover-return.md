# F05 – Handover & Return

## Mục tiêu

Ghi nhận bàn giao và hoàn trả thực tế của từng asset đã được duyệt.

## Actors

Nhân viên; User có permission bàn giao/nhận trả/xem lịch sử.

## User Stories

- US-F05-01 – Xác nhận bàn giao.
- US-F05-02 – Xem tài sản đang mượn.
- US-F05-03 – Xác nhận hoàn trả.
- US-F05-04 – Xem lịch sử mượn của tôi.
- US-F05-05 – Xem toàn bộ lịch sử mượn.

## Business Rules áp dụng

`BR-HAN-01..06`, `BR-RET-01..04`, `BR-BOR-18`, `BR-MED-01`, `BR-MED-04..06`.

## Functional Requirements liên quan

`FR-F05-01..05`, `FR-MED-01..04`.

## Evidence behavior

Handover và normal/damaged return nhận `mediaIds` ảnh optional. Evidence được
claim một lần và insert vào typed relation trong cùng transaction với history,
return condition và asset state. History detail đọc lại `handoverEvidence[]` và
`returnEvidence[]`; request không có media giữ nguyên behavior cũ.

## Dependencies

F01, F03, F04 và F06; trả hỏng tạo issue `CONFIRMED` theo BR-ISS-08.

## Out of Scope

Biên bản/bảng handover riêng ngoài baseline.
