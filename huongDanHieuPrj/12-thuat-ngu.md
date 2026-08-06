# 12. Thuật ngữ cho người mới

| Thuật ngữ | Hiểu đơn giản |
|---|---|
| Feature | Một khu vực nghiệp vụ lớn |
| User Story | Một mục tiêu nhỏ của người dùng |
| Screen/View | Một màn hình giao diện |
| Action | Hành động nghiệp vụ như Approve hoặc Return |
| Frontend | Phần chạy trên browser |
| Backend | Phần xử lý API và business rule |
| API | Cổng giao tiếp giữa frontend và backend |
| Route | Khai báo URL và HTTP method |
| Controller | Nhận request và trả response |
| Service | Nơi xử lý business rule chính |
| Repository | Lớp đọc/ghi database |
| Prisma | Công cụ giúp code TypeScript làm việc với database |
| Model | Mô tả một bảng hoặc đối tượng dữ liệu |
| DTO | Cấu trúc dữ liệu gửi/nhận qua API |
| Permission | Quyền thực hiện một hành động |
| Transaction | Nhóm nhiều thay đổi phải cùng thành công hoặc cùng rollback |
| Middleware | Lớp chạy trước controller, thường để auth/permission |
| Status | Trạng thái hiện tại của request, asset hoặc issue |
| FK | Foreign Key, khóa nối sang bảng khác |
| PK | Primary Key, khóa định danh một dòng |
| Trace | Lần theo một hành động qua các lớp code |
| Integration test | Test nhiều lớp cùng chạy với database |

## Một câu nhớ nhanh

```text
Feature cho biết học khu vực nào.
User Story cho biết học mục tiêu nào.
Screen cho biết tìm nút ở đâu.
FE → BE → DB cho biết nút đó chạy như thế nào.
Test cho biết nó có thực sự đúng không.
```
