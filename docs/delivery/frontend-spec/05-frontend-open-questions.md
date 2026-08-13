# Frontend Open Questions

Các câu hỏi dưới đây không thay đổi Business Rule hoặc Functional Requirement. Chúng chỉ cần được chốt trước screen spec chi tiết/Stitch update/implementation.

| ID | Câu hỏi | Ảnh hưởng |
| --- | --- | --- |
| FOQ-01 | Permission registry/code cuối cùng cho từng menu, action và Dashboard widget là gì? | Navigation, Dashboard, route guard. |
| FOQ-02 | Widget Dashboard được sắp theo priority nào và empty state ra sao khi user không có queue/action nào? | SCR-APP-01. |
| FOQ-05 | Đã chốt: camera thuộc màn hình Asset QR Scan riêng; Asset List chỉ điều hướng tới scanner. | Asset List, QR Scan screen. |
| FOQ-06 | MVP desktop-first có cần bản mobile hoàn chỉnh ở cùng mốc implementation không? | Responsive detail và table strategy. |
| FOQ-07 | Search/filter/sort/pagination cụ thể của từng list sẽ được chốt ở screen spec hay API contract? | List/table behavior, route query. |
| FOQ-08 | Với user có cả permission xem history cá nhân và toàn bộ, UI chọn scope bằng tab/filter hay entry navigation riêng? | SCR-F05-02. |

## Không phải Open Question

- Dashboard theo permission, không theo role, đã chốt.
- Không có role hierarchy.
- Return damaged ghi return, tạo issue `CONFIRMED` và đưa asset về `DAMAGED` theo BR-ISS-08.
- QR chỉ mở Asset Detail, không tạo inventory/stocktake.
- Registration không cho guest tự chọn role/department; chỉ reviewer có permission mới gán khi duyệt. Role CRUD hoặc permission CRUD vẫn ngoài MVP.

## Resolved during implementation

- FOQ-03 (F06 portion): confirm/reject and repair actions remain workflow states in `SCR-F06-02`; focused data entry uses Ant Design modal rather than separate routes.
- FOQ-04: Notification Center is a full page. The header bell shows unread count and navigates directly to it; no preview popover is included in the MVP.
