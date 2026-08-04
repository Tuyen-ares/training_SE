# UC-BOR-01 — Create Borrow Request / Tạo phiếu mượn

**Source:** `US-F03-01` · **FR:** `FR-F03-01`, `FR-F03-02` · **Status:** Planned

## Goal

Allow an employee to request one or more available assets for work.

## Actor and preconditions

- Primary actor: employee.
- The user is authenticated and has `borrow_request.create`.
- The user has selected at least one asset and supplies an expected return date.

## Trigger

The employee submits a borrow request.

## Main flow

1. The employee selects one or more assets and enters the expected return date.
2. The system validates the request input.
3. The system validates that every asset exists, is `AVAILABLE`, and appears once only.
4. The system creates one request header owned by the current user.
5. The system creates one `PENDING` detail for each asset.
6. The system returns the created request.

## Alternative and exception flows

- No asset is selected or the return date is invalid: reject the request with validation feedback.
- An asset is duplicated, missing, or no longer `AVAILABLE`: reject the invalid submission and create no incorrect data.
- Multiple users request the same `AVAILABLE` asset: each request may be created as `PENDING`; no reservation occurs here.

## Postconditions

- One request and its `PENDING` details exist.
- Asset statuses remain `AVAILABLE` until approval.

## Acceptance criteria

- `AC-US-F03-01-01`: Given đã chọn ít nhất một asset `AVAILABLE` và ngày trả dự kiến hợp lệ, when gửi phiếu, then hệ thống tạo một request cùng các detail `PENDING`.
- `AC-US-F03-01-02`: Then asset vẫn `AVAILABLE` cho tới khi một detail được duyệt.
- `AC-US-F03-01-03`: Given cùng asset xuất hiện nhiều lần trong phiếu, then hệ thống từ chối.
- `AC-US-F03-01-04`: Given asset không tồn tại hoặc không còn `AVAILABLE` lúc gửi, then hệ thống từ chối detail/phiếu theo validation được hiển thị và không tạo dữ liệu sai.
- `AC-US-F03-01-05`: Given nhiều nhân viên cùng tạo request `PENDING` cho một asset `AVAILABLE`, then các request đều có thể được ghi nhận.

## Business rules

`BR-BOR-01`, `BR-BOR-02`, `BR-BOR-04`, `BR-BOR-05`, `BR-AST-02`.
