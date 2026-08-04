# UC-BOR-04 — Withdraw Borrow Request / Thu hồi phiếu mượn

**Source:** `US-F03-04` · **FR:** `FR-F03-05`, `FR-F04-05` · **Status:** Deferred

## Goal

Allow an employee to cancel an unhanded-over request that is no longer needed.

## Actor and preconditions

- Primary actor: employee who owns the request.
- The user is authenticated and has `borrow_request.cancel_own`.
- No detail in the request has an asset in `BORROWED` state.

## Trigger

The employee chooses **Withdraw** on an eligible request.

## Main flow

1. The employee requests cancellation.
2. The system verifies ownership and that no asset was handed over.
3. The system changes the request header to `CANCELLED`.
4. The system releases every asset reserved by the request from `RESERVED` to `AVAILABLE`.
5. The system preserves all detail statuses for audit history.

## Alternative and exception flows

- Any detail has a handed-over/`BORROWED` asset: reject the cancellation without changing data.
- The request belongs to another employee: deny access.

## Postconditions

The request is `CANCELLED`; eligible reservations are released; detail history remains intact.

## Acceptance criteria

- `AC-US-F03-04-01`: Given phiếu thuộc user và chưa có asset nào `BORROWED`, when thu hồi, then header chuyển `CANCELLED`.
- `AC-US-F03-04-02`: Then mọi asset đang `RESERVED` bởi phiếu chuyển về `AVAILABLE`.
- `AC-US-F03-04-03`: Then trạng thái các detail được giữ nguyên để bảo toàn lịch sử xử lý.
- `AC-US-F03-04-04`: Given có ít nhất một asset đã `BORROWED`, when thu hồi, then hệ thống từ chối và không thay đổi dữ liệu.
- `AC-US-F03-04-05`: Given phiếu không thuộc user, then user không được thu hồi bằng quyền của nhân viên.

## Business rules

`BR-BOR-09`, `BR-BOR-16`, `BR-BOR-17`, `BR-RET-04`.
