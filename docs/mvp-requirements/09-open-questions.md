# Open Questions, Decisions và Discrepancies

Các quyết định dưới đây đã được chốt và phải được phản ánh trong BR/FR/User Story. Chỉ các mục còn ghi “chưa chốt” mới được xem là Open Question.

## Decisions đã chốt

| ID | Quyết định | Phạm vi ảnh hưởng |
|---|---|---|
| OQ-01 | Khi Manager/Admin tiếp nhận và xác nhận asset hỏng lúc trả: cập nhật borrow_history.return_date, đặt return_condition = DAMAGED, tạo asset_issue ở CONFIRMED, chuyển asset BORROWED → DAMAGED; không giữ asset ở BORROWED. | F05, F06, BR-ISS-08 |
| OQ-02 | Notification nội bộ được tạo khi: tạo request; detail/header được xử lý; issue ở REPORTED, CONFIRMED, REJECTED, COMPLETED, FAILED; bàn giao; hoàn trả. Recipient xác định theo user/permission và entity, không hard-code tên role. | F07, BR-NOT-04..05 |
| OQ-03 | Người đang mượn được báo issue cho asset mình đang mượn; user có permission quản lý/xử lý issue được báo trong phạm vi được cấp; không phải mọi user đăng nhập. | F06, BR-ISS-01 |
| OQ-04 | Sửa FAILED chuyển asset IN_REPAIR → DAMAGED; không tự động chuyển RETIRED. | F06, BR-ISS-07 |
| OQ-05 | Nhân viên được xem asset đủ điều kiện mượn trên toàn công ty. department_id chỉ thể hiện đơn vị quản lý, không giới hạn visibility trong MVP. | F02, BR-AST-08 |
| OQ-06 | QR thuộc F02 ở mức nhận diện/tra cứu và có thể mở trang chi tiết asset. Không có QR inventory, stocktake hoặc check-in/check-out workflow. | F02, BR-AST-09 |
| OQ-07 | Không hỗ trợ xóa brand/type/model đang được tham chiếu; MVP chỉ hỗ trợ tạo/xem/cập nhật danh mục ở mức cần thiết. | F02, BR-AST-10 |
| OQ-08 | Không có feature self-service profile; thông tin user do Admin quản lý. | F08 |
| OQ-09 | Chỉ user có permission quản lý asset phù hợp được chuyển RETIRED; không chuyển trực tiếp từ RESERVED hoặc BORROWED; cho phép từ AVAILABLE, DAMAGED, IN_REPAIR khi có quyết định không còn sử dụng. | F02, BR-ISS-06 |

## Open Questions còn lại

Hiện chưa còn câu hỏi nghiệp vụ bắt buộc để viết bộ Requirement MVP. Nếu phát sinh quyết định mới, bổ sung ID tiếp theo và cập nhật traceability cùng thay đổi.

## Discrepancies với tài liệu repository cũ

| ID | Tài liệu cũ | Baseline requirement mới |
|---|---|---|
| D-01 | Một số spec giữ asset ngay khi tạo request. | Asset vẫn AVAILABLE khi detail PENDING; chỉ RESERVED khi detail được duyệt. |
| D-02 | Spec cũ duyệt cấp header và chuyển thẳng asset sang borrowed. | Duyệt theo detail tạo reservation; chỉ bàn giao mới chuyển BORROWED. |
| D-03 | Một số tài liệu dùng repair_logs. | Baseline hiện tại dùng asset_issues. |
| D-04 | ERD/SRS cũ đề xuất inventory, location và asset history. | Các module/bảng này ngoài MVP và không được thêm vào schema. |
| D-05 | Permission registry cũ dùng nhóm code repair_log.*. | Tên permission issue/repair cần được thống nhất khi implementation; requirement dùng hành vi, không phụ thuộc code cũ. |
| D-06 | Auth spec cũ có public registration. | MVP chỉ dùng tài khoản nội bộ do Admin quản lý; public registration ngoài phạm vi. |
| D-07 | Spec cũ mô tả khác nhau về CRUD role/permission. | MVP chỉ cho gán/gỡ role có sẵn; không CRUD role hoặc permission code. |

## Quy tắc xử lý

- Khi quyết định mới ảnh hưởng schema, tạo một migration/decision task riêng sau khi được phê duyệt.
- Không dùng discrepancies làm lý do sửa code hoặc database ngoài phạm vi được yêu cầu.
