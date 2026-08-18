# F06 – Asset Issues & Repair

## Mục tiêu

Theo dõi sự cố từ lúc báo, xác minh đến quá trình và kết quả sửa chữa.

## Actors

Người báo sự cố; User có permission xử lý issue/sửa chữa.

## User Stories

- US-F06-01 – Báo sự cố.
- US-F06-02 – Xem danh sách và chi tiết issue.
- US-F06-03 – Xác minh issue.
- US-F06-04 – Bắt đầu sửa chữa.
- US-F06-05 – Cập nhật quá trình sửa.
- US-F06-06 – Kết thúc sửa chữa.

## Business Rules áp dụng

`BR-ISS-01..08`, `BR-AST-01..04`, `BR-MED-01`, `BR-MED-04..06`.

## Functional Requirements liên quan

`FR-F06-01..08`, `FR-MED-01..04`.

## Quy ước dữ liệu sửa chữa

- Khi bắt đầu sửa chữa, người xử lý ghi thông tin khởi tạo như vendor, ngày bắt đầu, chi phí và chẩn đoán/ghi chú ban đầu.
- `result` là kết quả kỹ thuật sau khi xử lý; không phải tên trạng thái issue và không cần nhập ở bước Start Repair.
- `result` được nhập khi cập nhật hoặc kết thúc sửa chữa; Complete Repair bắt buộc có kết quả, còn Fail Repair dùng kết quả để ghi nguyên nhân/kết quả thất bại.
- Report Issue chỉ nhập mô tả sự cố, không nhập repair result.
- Repair mutations dùng strict `vendorId`: omitted giữ vendor hiện tại; number gán vendor active; `null` clear vendor. Set/clear cần cả repair permission của endpoint và `vendor.view`; `repairProvider` bị từ chối.
- Vendor inactive không được chọn cho repair mới, nhưng vendor hiện tại của issue lịch sử vẫn hiển thị theo tên master hiện tại.
- Complete Repair thành công nhận `mediaIds` evidence ảnh optional và trả lại trong issue detail; Fail Repair không nhận evidence trong MVP.

## Dependencies

F01, F02 và F05; issue `CONFIRMED` có thể được tạo ngay khi xác nhận asset hỏng lúc hoàn trả.

## Out of Scope

Lịch bảo trì định kỳ, SLA, procurement và accounting.
