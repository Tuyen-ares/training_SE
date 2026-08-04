# US-F03-03 – Xem chi tiết phiếu của tôi

## User Story

Là một **Employee**,  
tôi muốn **xem trạng thái từng asset trong phiếu của mình**,  
để **biết asset nào đang chờ, được duyệt hay bị từ chối**.

## Acceptance Criteria

- AC-US-F03-03-01: Given phiếu thuộc user hiện tại, when mở chi tiết, then hệ thống hiển thị header và toàn bộ detail.
- AC-US-F03-03-02: Then mỗi detail hiển thị asset, ngày trả dự kiến, approval status và lý do từ chối khi có.
- AC-US-F03-03-03: Then trạng thái duyệt chỉ là `PENDING`, `APPROVED` hoặc `REJECTED`.
- AC-US-F03-03-04: Given phiếu không thuộc user và user thiếu permission xem toàn bộ, then hệ thống từ chối.

## Business Rules áp dụng

`BR-BOR-03`, `BR-BOR-04`.

## Functional Requirements liên quan

`FR-F03-04`.
