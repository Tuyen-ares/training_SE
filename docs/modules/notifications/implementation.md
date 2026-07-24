# Implementation — Notification

## 1. Trạng thái

**Chưa triển khai.**

## 2. Thành phần đã có

- Spec pattern Publisher–Subscriber, Channel Adapter và lộ trình Outbox.
- Event names mục tiêu trong architecture/module specs.
- Permission/auth infrastructure có thể bảo vệ API tương lai.

## 3. Thành phần chưa có

- Event Bus và DomainEvent type.
- Prisma `notifications` model/migration.
- Repository/service/controller/routes.
- Event handlers/template mapping.
- Frontend center/unread badge.
- Email provider/channel.
- Delivery table/retry.
- Outbox/worker.

## 4. API đang hoạt động

Không có Notification endpoint.

## 5. Data thực tế

Không có bảng `notifications`, `notification_deliveries` hoặc `outbox_events`
trong schema hiện tại.

## 6. Ràng buộc triển khai

Không bắt đầu Notification bằng cách gọi NotificationService trực tiếp từ
Borrow/Repair. Event Bus phải là boundary và event chỉ publish sau commit.

## 7. Bước implement tiếp theo

Hoàn thiện Borrow vertical slice đầu tiên, chốt NOT-T01, sau đó implement
NOT-T02–T03 như một proof of flow trước khi tạo toàn bộ Notification UI/API.
