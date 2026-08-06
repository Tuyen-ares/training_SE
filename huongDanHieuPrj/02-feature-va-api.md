# 02. Feature, User Story, Screen và API

## Feature là gì?

Feature là một khu vực nghiệp vụ lớn, ví dụ:

```text
F03 – Borrow Request
F04 – Approval & Reservation
F05 – Handover & Return
```

## User Story là gì?

User Story là một mục tiêu nhỏ, có thể đọc và kiểm tra độc lập:

```text
Nhân viên muốn tạo phiếu mượn để xin mượn thiết bị.
```

Một Feature thường có nhiều User Story.

## Screen là gì?

Screen là giao diện người dùng. Một screen có thể chứa nhiều hành động khác nhau, thậm chí phục vụ nhiều permission.

Ví dụ `Borrow Request Detail` có thể có:

- xem phiếu;
- thu hồi phiếu;
- approve detail;
- reject detail;
- approve all;
- mở ngữ cảnh handover.

Vì vậy không nên nói “hôm nay tôi đọc xong screen Borrow Request Detail” nếu chưa tách từng action.

## API là gì?

API là cổng giao tiếp giữa frontend và backend. API không phải là nghiệp vụ độc lập; API thực hiện một phần của User Story.

Ví dụ:

```text
User Story: Tạo phiếu mượn
Action: Submit Request
API: POST /api/borrow-requests
```

Một User Story có thể gọi nhiều API. Một API cũng có thể được nhiều screen sử dụng.

## Cách chọn thứ tự đọc

```text
1. Chọn Feature để biết khu vực.
2. Chọn một User Story.
3. Tìm Screen thực hiện story.
4. Chọn action chính có nghiệp vụ.
5. Trace từ FE xuống BE.
```

Nên trace sâu các action như `Submit`, `Approve`, `Reject`, `Handover`, `Return`, `Start Repair`. Không cần trace sâu `Back`, `Close drawer`, `Change tab`, `Reset filter` nếu chúng chỉ là UI.

