# US-F03-04 – Thu hồi phiếu

## User Story

Là một **nhân viên**,  
tôi muốn **thu hồi toàn bộ phiếu chưa có asset nào được bàn giao**,  
để **hủy nhu cầu mượn không còn cần thiết**.

## Acceptance Criteria

- AC-US-F03-04-01: Given phiếu thuộc user và chưa có asset nào `BORROWED`, when thu hồi, then header chuyển `CANCELLED`.
- AC-US-F03-04-02: Then mọi asset đang `RESERVED` bởi phiếu chuyển về `AVAILABLE`.
- AC-US-F03-04-03: Then trạng thái các detail được giữ nguyên để bảo toàn lịch sử xử lý.
- AC-US-F03-04-04: Given có ít nhất một asset đã `BORROWED`, when thu hồi, then hệ thống từ chối và không thay đổi dữ liệu.
- AC-US-F03-04-05: Given phiếu không thuộc user, then user không được thu hồi bằng quyền của nhân viên.

## Business Rules áp dụng

`BR-BOR-09`, `BR-BOR-16`, `BR-BOR-17`, `BR-RET-04`.

## Functional Requirements liên quan

`FR-F03-05`, `FR-F04-05`.
