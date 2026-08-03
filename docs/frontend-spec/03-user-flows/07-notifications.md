# FLOW-19 – Xem, đọc và mở notification

## Goal

Theo dõi notification của bản thân và mở đúng ngữ cảnh nghiệp vụ.

## Actor

User đã đăng nhập.

## Related User Stories

`US-F07-01..03`.

## Preconditions

User có notification hoặc có thể mở Notification Center rỗng.

## Main Flow

1. User mở Notification Center từ header/Dashboard.
2. Hệ thống hiển thị notification của chính user theo thời gian mới nhất, trạng thái đọc và unread count.
3. User đánh dấu notification chưa đọc đã đọc.
4. Hệ thống ghi read state/time và giảm unread count.
5. User mở notification có logical reference; hệ thống điều hướng tới entity khi user có quyền.

## Alternative Flows

- Notification không có reference vẫn hiển thị nội dung, không đưa link sai.

## Error / Invalid States

- Notification của user khác: không được cập nhật.
- Entity không còn tồn tại: not-found nhưng Notification Center không lỗi.
- User thiếu quyền entity: forbidden dù user là recipient.

## Result

User theo dõi được event request, approval, issue, handover và return có liên quan theo BR-NOT-04..05.

## Related Screens

`SCR-F07-01`, các screen entity liên quan, `SCR-SYS-02`.
