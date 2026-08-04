# UC-APR-01 — View Review Queue / Xem hàng đợi duyệt

**Source:** `US-F04-01` · **FR:** `FR-F04-01` · **Status:** Planned

## Goal

Allow an authorized reviewer to find requests and details awaiting action.

## Actor and preconditions

- Primary actor: user authorized to process borrow requests.
- The user is authenticated and has `borrow_request.view_all`.

## Trigger

The reviewer opens the review queue.

## Main flow

1. The reviewer opens the queue.
2. The system checks the review-view permission.
3. The system returns requests in the permitted scope, including their header and detail statuses.
4. The system makes `PENDING` details identifiable.
5. The reviewer chooses a detail for `UC-APR-02` or `UC-APR-03`.

## Alternative and exception flows

- No pending detail exists: return an empty queue.
- Permission is absent: return forbidden and disclose no other user's data.
- Scope rules beyond permission are not yet decided; the approved API contract must define them.

## Postconditions

No business data is changed.

## Acceptance criteria

- `AC-US-F04-01-01`: Given có permission, when mở danh sách, then hệ thống hiển thị các phiếu thuộc phạm vi được phép.
- `AC-US-F04-01-02`: Then hệ thống thể hiện trạng thái tổng và trạng thái từng detail.
- `AC-US-F04-01-03`: Then user có thể nhận biết detail nào còn `PENDING`.
- `AC-US-F04-01-04`: Given thiếu permission xem toàn bộ, then hệ thống không cung cấp dữ liệu của người khác.

## Business rules

`BR-BOR-03`, `BR-BOR-04`, `BR-RBAC-01`.
