# 10. Debug, Network và Test

## Kiểm tra một action trên browser

1. Mở DevTools → Network.
2. Bấm đúng action nghiệp vụ.
3. Tìm request mới xuất hiện.
4. Kiểm tra method và URL.
5. Kiểm tra request body.
6. Kiểm tra status code.
7. Kiểm tra response.
8. Refresh và xem dữ liệu có còn đúng không.

## Ý nghĩa status code thường gặp

| Code | Ý nghĩa |
|---|---|
| 200/201 | Thành công |
| 400 | Dữ liệu gửi lên không hợp lệ |
| 401 | Chưa đăng nhập hoặc token không hợp lệ |
| 403 | Đã đăng nhập nhưng thiếu permission |
| 404 | Không tìm thấy resource |
| 409 | Xung đột trạng thái/dữ liệu trùng |
| 500 | Lỗi backend chưa được xử lý đúng |

## Kiểm tra backend

Từ root project:

```text
pnpm --filter backend typecheck
pnpm --filter backend build
```

Frontend:

```text
pnpm build:frontend
```

Project hiện chưa có test suite frontend đầy đủ. Không nên gọi “đã test toàn bộ” chỉ vì build thành công.

## Mẫu ghi bằng chứng

```md
Action: Approve detail
Request: POST /api/borrow-request-details/12/approve
Response: 200
Before: detail=PENDING, asset=AVAILABLE
After: detail=APPROVED, asset=RESERVED
Database: verified
Test: borrow lifecycle integration test
```

## Khi gặp lỗi

Đừng sửa ngay. Ghi lại:

```text
Màn hình nào?
Đã bấm action nào?
Request URL là gì?
Status code là gì?
Response báo gì?
Backend log ở đâu?
Database trước/sau thế nào?
```

