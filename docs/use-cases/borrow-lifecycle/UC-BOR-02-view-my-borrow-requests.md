# UC-BOR-02 — View My Borrow Requests / Xem phiếu mượn của tôi

**Source:** `US-F03-02` · **FR:** `FR-F03-03`, `FR-F04-05` · **Status:** Planned

## Goal

Allow an employee to track requests created by that employee.

## Actor and preconditions

- Primary actor: employee.
- The user is authenticated and has `borrow_request.view_own`.

## Trigger

The employee opens **My Borrow Requests**.

## Main flow

1. The employee opens the request list.
2. The system authenticates the user and checks the permission.
3. The system queries only request headers owned by the current user.
4. The system derives the latest header status from details and histories.
5. The system returns a paginated list with request ID, creation date and status.
6. The employee may select one row to start `UC-BOR-03`.

## Alternative and exception flows

- No owned requests exist: return an empty list.
- The user is not authenticated: return `401`.
- The user lacks permission or tries to access another employee's private list: deny access.

## Postconditions

No business data is changed.

## Acceptance criteria

- `AC-US-F03-02-01`: When mở danh sách của tôi, then chỉ các phiếu do user hiện tại tạo được hiển thị.
- `AC-US-F03-02-02`: Then mỗi phiếu hiển thị tối thiểu mã, ngày tạo và trạng thái tổng.
- `AC-US-F03-02-03`: Given user cố xem danh sách riêng của người khác mà không có permission, then hệ thống từ chối.
- `AC-US-F03-02-04`: Danh sách phản ánh trạng thái tổng mới nhất theo các detail.

## Business rules

`BR-BOR-13`, `BR-BOR-14`, `BR-BOR-15`, `BR-BOR-18`.
