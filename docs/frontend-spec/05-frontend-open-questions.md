# Frontend Open Questions

Các câu hỏi dưới đây không thay đổi Business Rule hoặc Functional Requirement. Chúng chỉ cần được chốt trước screen spec chi tiết/Stitch update/implementation.

| ID | Câu hỏi | Ảnh hưởng |
| --- | --- | --- |
| FOQ-01 | Permission registry/code cuối cùng cho từng menu, action và Dashboard widget là gì? | Navigation, Dashboard, route guard. |
| FOQ-02 | Widget Dashboard được sắp theo priority nào và empty state ra sao khi user không có queue/action nào? | SCR-APP-01. |
| FOQ-03 | Workflow có context (reject, handover, return, repair, retire, activate/deactivate) dùng Modal hay Drawer theo pattern Stitch/Design System nào? | Các screen detail/queue. |
| FOQ-04 | Notification Center chỉ là full page, hay cần thêm preview popover ở header? | SCR-F07-01/AppShell. |
| FOQ-05 | QR nhập thủ công, camera browser hay thiết bị scanner keyboard-wedge? | Entry của Asset List/Detail; không ảnh hưởng rule QR. |
| FOQ-06 | MVP desktop-first có cần bản mobile hoàn chỉnh ở cùng mốc implementation không? | Responsive detail và table strategy. |
| FOQ-07 | Search/filter/sort/pagination cụ thể của từng list sẽ được chốt ở screen spec hay API contract? | List/table behavior, route query. |
| FOQ-08 | Với user có cả permission xem history cá nhân và toàn bộ, UI chọn scope bằng tab/filter hay entry navigation riêng? | SCR-F05-02. |

## Không phải Open Question

- Dashboard theo permission, không theo role, đã chốt.
- Không có role hierarchy.
- Return damaged ghi return, tạo issue `CONFIRMED` và đưa asset về `DAMAGED` theo BR-ISS-08.
- QR chỉ mở Asset Detail, không tạo inventory/stocktake.
- Không hỗ trợ public registration, role CRUD hoặc permission CRUD trong MVP.
