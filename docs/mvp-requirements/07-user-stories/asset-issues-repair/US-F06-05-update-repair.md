# US-F06-05 – Cập nhật quá trình sửa

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **cập nhật thông tin quá trình xử lý**,  
để **chi phí, đơn vị sửa và tiến độ được theo dõi tập trung**.

## Acceptance Criteria

- AC-US-F06-05-01: Given issue đang ở giai đoạn cho phép, when cập nhật hợp lệ, then hệ thống lưu thông tin mới.
- AC-US-F06-05-02: Thông tin có thể gồm vendor, ngày bắt đầu/kết thúc, chi phí, kết quả và ghi chú theo baseline.
- AC-US-F06-05-03: Given chi phí hoặc thời gian không hợp lệ, then hệ thống từ chối và giữ dữ liệu cũ.
- AC-US-F06-05-04: Given user thiếu permission, then hệ thống không thay đổi issue.
- AC-US-F06-05-05: `vendorId` omitted giữ vendor và không cần `vendor.view`; number hoặc `null` cần đồng thời `asset_issue.update` và `vendor.view`.

## Business Rules áp dụng

`BR-ISS-03`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F06-06`.
