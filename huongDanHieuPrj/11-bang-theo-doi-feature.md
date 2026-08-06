# 11. Bảng theo dõi Feature

Hãy copy bảng này cho từng User Story.

| Trường | Ghi gì? |
|---|---|
| Feature | Ví dụ F03 Borrow Request |
| User Story | Ví dụ US-F03-01 |
| Actor | Employee, Manager hoặc user có permission |
| Screen | File `.vue` thực hiện action |
| Action | Submit, Approve, Return... |
| Frontend function | Tên hàm xử lý click/submit |
| API | Method + URL |
| Permission | Permission được kiểm tra |
| Backend route | File route |
| Controller | Method controller |
| Service | Method business chính |
| Repository | Method đọc/ghi database |
| Tables | Bảng bị đọc/thay đổi |
| State change | Trạng thái trước → sau |
| Test | Tên integration test hoặc browser evidence |
| Status | Not started / UI only / Connected / Verified |
| Ghi chú | Lỗi hoặc open question |

## Ví dụ đã điền

| Trường | Ví dụ |
|---|---|
| Feature | F03 Borrow Request |
| User Story | US-F03-01 Create request |
| Actor | Employee có `borrow_request.create` |
| Screen | `BorrowRequestCreateView.vue` |
| Action | Submit Request |
| Frontend function | Hàm submit trong view |
| API | `POST /api/borrow-requests` |
| Tables | `borrow_requests`, `borrow_request_details` |
| State change | tạo header + nhiều detail `PENDING` |
| Status | Connected hoặc Verified sau khi test |

## Quy tắc cập nhật

- `UI only`: mới có giao diện.
- `Connected`: đã gọi API nhưng chưa kiểm chứng dữ liệu đầy đủ.
- `Verified`: đã kiểm tra response, database và trạng thái sau thao tác.
- Nếu chưa biết, ghi `Unknown`, không đoán.

