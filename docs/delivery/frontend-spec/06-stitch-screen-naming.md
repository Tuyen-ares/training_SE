# Quy ước mã và tên screen trên Stitch

Tài liệu này giải thích nhãn hiển thị trên canvas Stitch. Mã chỉ phục vụ nhận diện và traceability; không thay đổi User Story, Functional Requirement hay nghiệp vụ.

## Cấu trúc nhãn

```text
SCR-<nhóm>-<số><biến thể> — <tên screen bằng tiếng Việt>
```

Ví dụ: `SCR-APP-01A — Dashboard tổng quan (quyền mở rộng)`.

| Thành phần | Ý nghĩa |
|---|---|
| `SCR` | Screen: một màn hình hoặc template màn hình. |
| `APP` | Application: màn hình cấp ứng dụng dùng chung sau khi đăng nhập. |
| `SYS` | System: trạng thái hệ thống dùng chung. |
| `F01`–`F08` | Feature 01 đến Feature 08 trong bộ MVP requirement. |
| `01`, `02`, … | Số thứ tự logical screen trong nhóm. |
| `A`, `B` | Biến thể của cùng một logical screen, không phải screen nghiệp vụ mới. |

## Batch 1

| Nhãn canvas cần dùng | Ý nghĩa |
|---|---|
| `SCR-APP-01A — Dashboard tổng quan (quyền mở rộng)` | Biến thể Dashboard khi user có nhiều effective permissions; chỉ các widget, queue và shortcut được phép mới hiển thị. |
| `SCR-APP-01B — Dashboard tổng quan (quyền cơ bản)` | Biến thể Dashboard khi user có tập effective permissions giới hạn. |
| `SCR-SYS-02A — Kết quả truy cập/tài nguyên (bị từ chối)` | Trạng thái forbidden an toàn; không tiết lộ resource nhạy cảm. |
| `SCR-SYS-02B — Kết quả truy cập/tài nguyên (không tìm thấy)` | Trạng thái not found an toàn. |

`SCR-APP-01A` và `SCR-APP-01B` vẫn cùng là logical screen `SCR-APP-01` trong [screen inventory](02-screen-inventory.md). Tương tự, `SCR-SYS-02A` và `SCR-SYS-02B` là hai state của `SCR-SYS-02`.

## Các nhóm Feature

| Mã | Feature |
|---|---|
| `F01` | Authentication & Access |
| `F02` | Asset Management |
| `F03` | Borrow Request |
| `F04` | Approval & Reservation |
| `F05` | Handover & Return |
| `F06` | Asset Issues & Repair |
| `F07` | Notifications |
| `F08` | Administration |
