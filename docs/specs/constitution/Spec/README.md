# Bộ spec — Hệ thống mượn thiết bị

## Cấu trúc

```
constitution.md          # Luật bất biến toàn dự án — Codex đọc TRƯỚC mọi task
specs/
  00-overview.md         # Bản đồ module, thứ tự build, state machine, event, glossary
  01-auth.md             # Authentication: login, JWT, refresh rotation, logout
  02-assets.md           # Quản lý thiết bị (+ models/types/brands) — chủ status asset
  03-users.md            # Người dùng & phòng ban
  04-rbac.md             # Quản trị roles/permissions, gán role
  05-borrow.md           # Mượn/trả — module phức tạp nhất (state machine)
  06-repair.md           # Sửa chữa
```

## Cách đưa cho Codex

1. Luôn nạp `constitution.md` + `specs/00-overview.md` làm ngữ cảnh nền cho mọi task.
2. Với mỗi module, nạp thêm file spec module đó.
3. Yêu cầu Codex: phân mảnh spec module thành technical plan → tasks atomic → implement,
   bám sát constitution và module mẫu đã có.

## Trước khi implement từng module

Trả lời các mục "Câu hỏi mở" ở cuối mỗi spec. Đây là các ambiguity đã được phát hiện
nhưng chưa quyết — chốt chúng TRƯỚC khi code sẽ rẻ hơn nhiều so với sửa sau.

## Thứ tự build đề xuất

Hạ tầng → 03 Users → 02 Assets → 01 Auth → 04 RBAC → 05 Borrow → 06 Repair.
Sau module thứ 2: dừng review, đối chiếu module mẫu + constitution trước khi làm tiếp.

## Lưu ý về acceptance criteria (EARS)

Mỗi REQ-xxx nên map sang ít nhất một test. Đặc biệt chú ý các REQ transition
(REQ-02xx) và REQ-0511/0531 ở module Mượn/trả — đó là chỗ logic dễ sai nhất.
