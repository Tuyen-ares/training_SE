# 07. Ví dụ Approval, Handover và Return

## Approval

Requirement:

- [US-F04-01 – Review queue](../docs/mvp-requirements/07-user-stories/approval-reservation/US-F04-01-view-review-queue.md)
- [US-F04-02 – Approve detail](../docs/mvp-requirements/07-user-stories/approval-reservation/US-F04-02-approve-detail.md)
- [US-F04-03 – Reject detail](../docs/mvp-requirements/07-user-stories/approval-reservation/US-F04-03-reject-detail.md)
- [US-F04-04 – Approve all](../docs/mvp-requirements/07-user-stories/approval-reservation/US-F04-04-approve-all.md)

Action `Approve`:

```text
ApprovalDetailView.vue
→ approveBorrowDetail()
→ POST /api/borrow-request-details/:detailId/approve
→ route + permission
→ borrow workflow service
→ transaction/row lock
→ detail APPROVED + asset RESERVED
```

Action `Approve All` cũng phải xử lý từng detail theo partial success. Một asset không giữ được không được tự chuyển thành `REJECTED` nếu rule không yêu cầu.

## Handover

```text
ApprovalDetailView.vue hoặc HandoverReturnView.vue
→ POST /api/borrow-request-details/:detailId/handover
→ tạo borrow_histories
→ asset RESERVED → BORROWED
```

`handed_over_by` là người xác nhận giao, không phải người mượn.

## Return bình thường

```text
HandoverReturnView.vue
→ POST /api/borrow-histories/:historyId/return
→ borrow_histories.return_date
→ received_by + return_condition = NORMAL
→ asset BORROWED → AVAILABLE
```

## Sáu câu kiểm tra

1. Ai có permission thực hiện action?
2. Detail đang ở trạng thái nào?
3. Asset đang ở trạng thái nào?
4. Có tạo hoặc cập nhật `borrow_histories` không?
5. Các bước có cùng transaction không?
6. Nếu bước cuối lỗi, dữ liệu trước đó có rollback không?

