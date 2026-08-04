# UC-FUL-02 — View My Current Borrowed Assets / Xem tài sản đang mượn

**Source:** `US-F05-02` · **FR:** `FR-F05-03` · **Status:** Planned

## Goal

Allow an employee to see assets currently in that employee's responsibility.

## Actor and preconditions

- Primary actor: employee.
- The user is authenticated and has `borrow_history.view_own`.

## Trigger

The employee opens **Current Borrowed Assets**.

## Main flow

1. The employee opens the current-borrow list.
2. The system authenticates the user and checks ownership-view permission.
3. The system finds histories whose request belongs to the current user and whose `return_date` is empty.
4. The system returns each asset, handover date and expected return date.
5. The employee reviews current return responsibilities.

## Alternative and exception flows

- No unreturned history exists: return an empty list.
- A detail is approved but no history exists: do not return it as a current borrow.
- Permission is absent: deny access.

## Postconditions

No business data is changed.

## Acceptance criteria

- `AC-US-F05-02-01`: When mở danh sách đang mượn, then hệ thống chỉ hiển thị history thuộc request của user hiện tại chưa hoàn trả.
- `AC-US-F05-02-02`: Then mỗi dòng hiển thị asset, ngày bàn giao và ngày trả dự kiến.
- `AC-US-F05-02-03`: Detail chỉ `APPROVED` nhưng chưa có bàn giao không được coi là đang mượn.
- `AC-US-F05-02-04`: Asset đã có return date không còn xuất hiện trong danh sách đang mượn.

## Business rules

`BR-HAN-03`, `BR-HAN-06`.
