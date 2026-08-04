# US-F02-04 – Tạo asset

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **tạo một tài sản với thông tin nhận diện hợp lệ**,  
để **đưa thiết bị mới vào danh mục quản lý**.

## Acceptance Criteria

- AC-US-F02-04-01: Given model hợp lệ và dữ liệu bắt buộc đầy đủ, when tạo, then asset được ghi nhận với status `AVAILABLE`.
- AC-US-F02-04-02: image_url là tùy chọn; nếu cung cấp thì được lưu dưới dạng URL ảnh của asset.
- AC-US-F02-04-03: Given QR đã tồn tại, when tạo, then hệ thống từ chối.
- AC-US-F02-04-04: Given serial có giá trị đã tồn tại, when tạo, then hệ thống từ chối.
- AC-US-F02-04-05: Given department không tồn tại, when tạo, then hệ thống từ chối.
- AC-US-F02-04-06: Given user thiếu quyền, then không tạo asset.

## Business Rules áp dụng

`BR-AST-01`, `BR-AST-05`, `BR-AST-06`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F02-04`.
