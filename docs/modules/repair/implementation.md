# Implementation — Repair

## 1. Trạng thái

**Chưa triển khai.**

## 2. Thành phần đã có

- Prisma schema có bảng `repair_logs`.
- Có `repair-log.model.ts` ở mức model ban đầu.
- AssetService đã có `startRepair` và `completeRepair`.
- Permission registry có nhóm `repair_log.*`.

## 3. Thành phần chưa có

- Repair repository contract/implementation.
- RepairService.
- Controller/routes và route registration.
- Validation chính thức.
- Automated tests.
- Domain event publish.
- Frontend Repair kết nối API.

## 4. API đang hoạt động

Không có Repair endpoint trong `routes/index.ts`.

## 5. Data lưu ý

Schema có `start_date`, `end_date`, `cost`, `note`, `handled_by`. Cần review cách
enforce tối đa một log mở cho mỗi asset trước khi implement.

## 6. Verification hiện tại

Chưa có test Repair hoặc Postman contract được xác nhận từ backend.

## 7. Bước implement tiếp theo

Repair phụ thuộc luồng trả asset của Borrow. Chỉ bắt đầu REP-T01–T04 sau khi
Borrow return flow và AssetService boundary ổn định.
