# US-F02-01 – Xem danh sách asset

## User Story

Là một **Employee, Asset Manager hoặc Admin**,  
tôi muốn **xem và lọc danh sách tài sản**,  
để **tìm được thiết bị cần theo dõi hoặc xử lý**.

## Acceptance Criteria

- AC-US-F02-01-01: Given user có quyền, when mở danh sách, then hệ thống hiển thị các asset thuộc phạm vi được phép.
- AC-US-F02-01-02: Then mỗi dòng thể hiện tối thiểu thông tin nhận diện, model và trạng thái hiện tại.
- AC-US-F02-01-03: When áp dụng bộ lọc được hỗ trợ, then kết quả chỉ chứa asset phù hợp.
- AC-US-F02-01-04: Given user thiếu quyền xem, when truy cập, then hệ thống từ chối.

## Business Rules áp dụng

`BR-AST-08`, `BR-RBAC-01`.

## Functional Requirements liên quan

`FR-F02-01`, `FR-F02-07`.
