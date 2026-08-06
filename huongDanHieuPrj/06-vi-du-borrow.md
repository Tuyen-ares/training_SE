# 06. Ví dụ trace Borrow Request

## Requirement liên quan

- [US-F03-01 – Tạo phiếu](../docs/mvp-requirements/07-user-stories/borrow-request/US-F03-01-create-request.md)
- [US-F03-02 – Xem danh sách của tôi](../docs/mvp-requirements/07-user-stories/borrow-request/US-F03-02-view-own-requests.md)
- [US-F03-03 – Xem chi tiết](../docs/mvp-requirements/07-user-stories/borrow-request/US-F03-03-view-own-request-detail.md)
- [US-F03-04 – Thu hồi](../docs/mvp-requirements/07-user-stories/borrow-request/US-F03-04-withdraw-request.md)
- [Borrow lifecycle use cases](../docs/use-cases/borrow-lifecycle/README.md)

## Tạo phiếu

```text
BorrowRequestCreateView.vue
→ borrow.service.js
→ POST /api/borrow-requests
→ borrow-request.routes.ts
→ borrow-request.controller.ts
→ borrow-request.service.ts
→ borrow-request.prisma.repository.ts
→ borrow_requests + borrow_request_details
```

Input thường gồm:

- note/purpose;
- nhiều asset;
- expected return date cho từng detail.

Rule cần kiểm tra:

- asset phải đủ điều kiện mượn;
- một request có thể có nhiều detail;
- không reserve asset chỉ vì vừa tạo request;
- trạng thái detail ban đầu là `PENDING`.

## Thu hồi phiếu

```text
BorrowRequestDetailView.vue
→ withdrawBorrowRequest()
→ POST /api/borrow-requests/:id/cancel
→ workflow service
→ borrow_requests + assets
```

Chỉ được thu hồi trước actual handover. Điều kiện chặn phải dựa trên việc đã có `borrow_history`, không chỉ nhìn status hiện tại của asset.

## Cách kiểm tra một phiếu

Đọc theo thứ tự:

1. Header `borrow_requests`.
2. Các dòng `borrow_request_details`.
3. Asset mỗi detail trỏ tới.
4. Nếu đã bàn giao, đọc `borrow_histories`.
5. Nếu đã có notification, đọc tham chiếu logical entity.

