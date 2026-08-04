# UC-BOR-03 — View My Borrow Request Detail / Xem chi tiết phiếu mượn của tôi

**Source:** `US-F03-03` · **FR:** `FR-F03-04` · **Status:** Planned

## Goal

Allow an employee to understand the outcome for every requested asset.

## Actor and preconditions

- Primary actor: employee.
- The user is authenticated and has `borrow_request.view_own`, or a separately authorized all-request view.

## Trigger

The employee selects a request from the owned-request list.

## Main flow

1. The employee opens a request detail.
2. The system checks ownership or all-request permission.
3. The system reads the header and all its details.
4. The system returns each asset, expected return date, approval status and rejection reason where present.
5. The employee views the current decision for each asset.

## Alternative and exception flows

- The request does not exist: return not found.
- The request belongs to another employee and no all-request permission exists: deny access.

## Postconditions

No business data is changed.

## Acceptance criteria

- `AC-US-F03-03-01`: Given phiếu thuộc user hiện tại, when mở chi tiết, then hệ thống hiển thị header và toàn bộ detail.
- `AC-US-F03-03-02`: Then mỗi detail hiển thị asset, ngày trả dự kiến, approval status và lý do từ chối khi có.
- `AC-US-F03-03-03`: Then trạng thái duyệt chỉ là `PENDING`, `APPROVED` hoặc `REJECTED`.
- `AC-US-F03-03-04`: Given phiếu không thuộc user và user thiếu permission xem toàn bộ, then hệ thống từ chối.

## Business rules

`BR-BOR-03`, `BR-BOR-04`.
