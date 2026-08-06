# Feature Guides – bản đồ đọc code

Đây là lớp hướng dẫn thực hành phía trên [bộ hướng dẫn đọc project](../README.md).

## Cách dùng

1. Mở [bức tranh toàn cảnh](00-buc-tranh-toan-canh.md).
2. Chọn một Feature.
3. Đọc phần `SPEC EXPECTS` trước để biết nghiệp vụ phải làm gì.
4. Chọn đúng một User Story/action.
5. Chỉ đọc các file trong `Minimum Reading Path` trước.
6. Nếu cần chi tiết, đi theo dòng trace của action đó.
7. Đối chiếu `CURRENT CODE`, `GAPS` và file test evidence.

## Ký hiệu mức độ đọc

- **ĐỌC KỸ**: business rule hoặc state transition nằm ở đây.
- **ĐỌC LƯỚT**: chỉ cần biết file gọi gì và trả dữ liệu gì.
- **CÓ THỂ BỎ QUA LÚC ĐẦU**: file UI phụ, mapping hoặc CRUD dùng chung; chỉ mở khi bị lỗi.

## Các Feature

- [F01 – Authentication & Access](F01-authentication-access.md)
- [F02 – Asset Management](F02-asset-management.md)
- [F03 – Borrow Request](F03-borrow-request.md)
- [F04 – Approval & Reservation](F04-approval-reservation.md)
- [F05 – Handover & Return](F05-handover-return.md)
- [F06 – Asset Issues & Repairs](F06-asset-issues-repair.md)
- [F07 – Notifications](F07-notifications.md)
- [F08 – Administration](F08-administration.md)

Mỗi guide là navigation map, không phải bản sao của requirement.

