# US-F07-03 – Mở đối tượng liên quan

## User Story

Là một **Employee, Asset Manager hoặc Admin**,  
tôi muốn **mở đối tượng nghiệp vụ liên quan**,  
để **xem ngữ cảnh đầy đủ của thông báo**.

## Acceptance Criteria

- AC-US-F07-03-01: Given logical reference hợp lệ và user có quyền xem entity, when mở, then hệ thống điều hướng tới nội dung tương ứng.
- AC-US-F07-03-02: Given notification không có reference, then hệ thống vẫn cho xem nội dung nhưng không cung cấp điều hướng sai.
- AC-US-F07-03-03: Given entity không còn tồn tại, then hệ thống báo không tìm thấy mà không làm lỗi danh sách notification.
- AC-US-F07-03-04: Given user thiếu quyền xem entity, then hệ thống từ chối truy cập dù user sở hữu notification.

## Business Rules áp dụng

`BR-NOT-01`, `BR-NOT-02`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F07-04`.
