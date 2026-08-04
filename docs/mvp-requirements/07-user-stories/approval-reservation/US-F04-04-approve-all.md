# US-F04-04 – Duyệt tất cả theo partial success

## User Story

Là một **Asset Manager hoặc Admin**,  
tôi muốn **duyệt hàng loạt các detail đang chờ đủ điều kiện**,  
để **xử lý phiếu nhanh nhưng không cấp trùng tài sản**.

## Acceptance Criteria

- AC-US-F04-04-01: Given phiếu có nhiều detail `PENDING`, when Approve All, then hệ thống kiểm tra và xử lý từng detail.
- AC-US-F04-04-02: Detail có asset `AVAILABLE` được chuyển `APPROVED` và asset chuyển `RESERVED`.
- AC-US-F04-04-03: Detail có asset không còn đủ điều kiện vẫn `PENDING` và trả về lý do không duyệt được.
- AC-US-F04-04-04: Thất bại của một detail không rollback các detail khác đã duyệt thành công trong bulk action.
- AC-US-F04-04-05: Given có detail thành công và còn detail khác trạng thái, then header là `PARTIALLY_APPROVED`.
- AC-US-F04-04-06: Mỗi detail thành công vẫn phải thỏa ràng buộc nguyên tử và chống double approval.

## Business Rules áp dụng

`BR-BOR-06`, `BR-BOR-10`, `BR-BOR-11`, `BR-BOR-12`, `BR-BOR-15`.

## Functional Requirements liên quan

`FR-F04-04`, `FR-F04-05`, `FR-F04-06`.
