# Tài liệu theo module

Mỗi module nghiệp vụ có một thư mục và bốn tài liệu với trách nhiệm tách biệt:

```text
docs/modules/<module>/
├── spec.md            # WHAT/WHY: contract nghiệp vụ ổn định
├── plan.md            # HOW: thiết kế dự kiến để đáp ứng spec
├── tasks.md           # WORK: checklist nhỏ và kiểm chứng được
└── implementation.md  # AS-BUILT: code thực tế, endpoint, test và phần còn thiếu
```

## Workflow bắt buộc

1. Chốt `spec.md`, đặc biệt là câu hỏi ảnh hưởng dữ liệu hoặc hành vi.
2. Viết hoặc điều chỉnh `plan.md`; plan không được mở rộng ngoài spec.
3. Tách plan thành `tasks.md`; mỗi task phải có dependency và cách verify.
4. Implement lần lượt; chỉ đánh dấu task hoàn thành sau khi verify.
5. Cập nhật `implementation.md` để phản ánh code thực tế và sai khác có chủ đích.
6. Nếu code làm thay đổi contract, quay lại sửa spec và review lại plan trước.

## Không được trộn lẫn

- Không ghi báo cáo “đã làm” trong spec.
- Không dùng plan làm snapshot trạng thái code.
- Không đánh dấu task hoàn thành chỉ vì đã tạo file.
- Không xem implementation là nguồn requirement.
- Không tạo module mới chỉ vì có một trang UI hoặc một bảng lookup.

## Các module hiện hành

- [`auth/`](auth/)
- [`assets/`](assets/)
- [`users/`](users/)
- [`rbac/`](rbac/)
- [`borrow/`](borrow/)
- [`repair/`](repair/)
- [`notifications/`](notifications/)

Dashboard là presentation feature tổng hợp dữ liệu từ nhiều module, không sở hữu bảng
nghiệp vụ nên không được thêm vào bản đồ module. Khi bắt đầu làm Dashboard, có thể tạo
bộ bốn tài liệu tương tự dưới khu vực feature frontend riêng, nhưng không biến Dashboard
thành domain module.
