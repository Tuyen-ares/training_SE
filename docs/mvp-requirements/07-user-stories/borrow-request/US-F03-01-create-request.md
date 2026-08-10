# US-F03-01 – Tạo phiếu mượn

## User Story

Là một **Employee**,  
tôi muốn **tạo phiếu yêu cầu một hoặc nhiều asset**,  
để **đề nghị cấp thiết bị phục vụ công việc**.

## Acceptance Criteria

- AC-US-F03-01-01: Given đã chọn ít nhất một asset `AVAILABLE` và ngày trả dự kiến hợp lệ, when gửi phiếu, then hệ thống tạo một request cùng các detail `PENDING`.
- AC-US-F03-01-02: Then asset vẫn `AVAILABLE` cho tới khi một detail được duyệt.
- AC-US-F03-01-03: Given cùng asset xuất hiện nhiều lần trong phiếu, then hệ thống từ chối.
- AC-US-F03-01-04: Given asset không tồn tại hoặc không còn `AVAILABLE` lúc gửi, then hệ thống từ chối detail/phiếu theo validation được hiển thị và không tạo dữ liệu sai.
- AC-US-F03-01-05: Given nhiều nhân viên cùng tạo request `PENDING` cho một asset `AVAILABLE`, then các request đều có thể được ghi nhận.
- AC-US-F03-01-06: Given Borrowing Purpose bị thiếu hoặc chỉ chứa khoảng trắng, when gửi phiếu, then hệ thống từ chối với validation và không tạo request.

## Business Rules áp dụng

`BR-BOR-01`, `BR-BOR-02`, `BR-BOR-04`, `BR-BOR-05`, `BR-AST-02`.

## Functional Requirements liên quan

`FR-F03-01`, `FR-F03-02`.
