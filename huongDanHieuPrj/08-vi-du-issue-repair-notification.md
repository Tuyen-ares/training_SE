# 08. Issue, Repair và Notification

## Báo sự cố

Requirement:

- [US-F06-01 – Report issue](../docs/mvp-requirements/07-user-stories/asset-issues-repair/US-F06-01-report-issue.md)
- [US-F06-02 – View issues](../docs/mvp-requirements/07-user-stories/asset-issues-repair/US-F06-02-view-issues.md)
- [US-F06-03 – Review issue](../docs/mvp-requirements/07-user-stories/asset-issues-repair/US-F06-03-review-issue.md)
- [US-F06-04 – Start repair](../docs/mvp-requirements/07-user-stories/asset-issues-repair/US-F06-04-start-repair.md)
- [US-F06-05 – Update repair](../docs/mvp-requirements/07-user-stories/asset-issues-repair/US-F06-05-update-repair.md)
- [US-F06-06 – Close repair](../docs/mvp-requirements/07-user-stories/asset-issues-repair/US-F06-06-close-repair.md)

Chuỗi trạng thái:

```text
REPORTED
├── REJECTED
└── CONFIRMED
    └── IN_REPAIR
        ├── COMPLETED
        └── FAILED
```

Code chính:

- [AssetIssueListView.vue](../apps/frontend/src/views/issues/AssetIssueListView.vue)
- [AssetIssueDetailView.vue](../apps/frontend/src/views/issues/AssetIssueDetailView.vue)
- [Asset issue routes](../apps/backend/src/routes/asset-issue.routes.ts)
- [Asset issue service](../apps/backend/src/services/asset-issue.service.ts)

## Phân biệt với trả hỏng

- Báo sự cố có thể xảy ra trong lúc đang mượn.
- Trả hỏng xảy ra khi Manager/Admin nhận lại asset.
- Trả hỏng cần cập nhật history, tạo issue `CONFIRMED` và chuyển asset sang `DAMAGED` trong cùng transaction.
- API combined `return-damaged` hiện là phần cần kiểm tra riêng trong delivery status.

## Notification

- [Notification Center](../apps/frontend/src/views/notifications/NotificationCenterView.vue)
- [Notification service](../apps/frontend/src/services/notification.service.js)
- [Notification routes](../apps/backend/src/routes/notification.routes.ts)
- [Notification model](../apps/backend/src/models/notification.model.ts)

Khi đọc notification, kiểm tra:

1. Ai là `recipient_user_id`?
2. User đó có xem được notification của người khác không?
3. `related_entity_type` và `related_entity_id` dẫn tới đối tượng nào?
4. Đánh dấu đã đọc có cập nhật `is_read` và `read_at` không?

