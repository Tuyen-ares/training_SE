# Bối cảnh MVP

## Đề tài

Hệ thống quản lý và theo dõi tài sản/thiết bị IT trong nội bộ công ty.

## Mục tiêu

Tạo một nguồn yêu cầu đủ rõ để Backend, Frontend và Tester cùng triển khai các luồng quản lý tài sản, mượn–duyệt–bàn giao–trả, sự cố–sửa chữa, thông báo và quản trị truy cập.

## Baseline kỹ thuật

Migration hiện tại đã hoàn tất. Database là baseline kỹ thuật và không được sửa trong task requirement. Nếu nghiệp vụ mới có khả năng cần thay đổi schema, chỉ ghi nhận tại Open Questions/Discrepancies.

Các aggregate chính: `assets`, `borrow_requests`, `borrow_request_details`, `borrow_histories`, `asset_issues`, `notifications`, `users` và flat RBAC.

## Thuật ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| Asset | Một tài sản/thiết bị vật lý riêng biệt. |
| Borrow request | Phần thông tin chung của một phiếu mượn. |
| Request detail | Một tài sản được yêu cầu trong phiếu; là đơn vị duyệt. |
| Reservation | Việc một detail đã duyệt giữ asset trước bàn giao. |
| Handover | Xác nh n giao tài sản thực tế cho người mượn. |
| Return | Xác nhận nhận lại tài sản thực tế. |
| Asset issue | Báo cáo và vòng đời xử lý sự cố/hỏng hóc. |
| Flat RBAC | Quyền suy ra từ role–permission, không có kế thừa role. |

## Thứ tự phát triển

1. Chốt nghiệp vụ và ERD.
2. Chốt database baseline.
3. Viết User Story, AC, BR và FR cho MVP.
4. Chốt spec.
5. Implement backend/frontend.
6. Test theo AC/BR.
