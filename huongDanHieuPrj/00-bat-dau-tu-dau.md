# 00. Bắt đầu từ đâu?

## Project đang có những phần nào?

```text
apps/frontend  = giao diện Vue/Vite
apps/backend   = API Express + TypeScript
prisma/schema  = mô tả bảng và quan hệ database
docs           = requirement, contract, frontend spec và báo cáo
```

Các thư mục `apps/frontend/src/views` và `apps/backend/src` là code ứng dụng. Các thư mục `apps/frontend/src/views/train` hoặc tài liệu cũ có thể là phần học thử/tham khảo, không nên dùng làm nguồn chính nếu đang đọc feature MVP.

## Đừng bắt đầu bằng cách đọc toàn bộ code

Hãy chọn một feature nhỏ, ví dụ `F03 Borrow Request`, rồi chọn một User Story:

- [US-F03-01 – Tạo phiếu mượn](../docs/mvp-requirements/07-user-stories/borrow-request/US-F03-01-create-request.md)

Sau đó mới tìm screen và hành động `Submit Request`.

## Bốn lớp cần phân biệt

| Lớp | Câu hỏi cần trả lời |
|---|---|
| Requirement | Hệ thống phải làm gì? |
| Code | Lập trình viên đã viết gì? |
| Runtime | Bấm trên browser có chạy thật không? |
| Database | Dữ liệu cuối cùng có thay đổi đúng không? |

Một nút có trên giao diện chưa có nghĩa là feature hoàn thành. Nút đó phải gọi đúng API, backend phải xử lý đúng rule, database phải lưu đúng và nên có test hoặc bằng chứng browser.

## Mục tiêu của lần đọc đầu tiên

Bạn chưa cần hiểu toàn project. Mục tiêu đầu tiên chỉ là hiểu một chuỗi nhỏ:

```text
Submit Request
→ POST /api/borrow-requests
→ tạo borrow_requests
→ tạo borrow_request_details
```

