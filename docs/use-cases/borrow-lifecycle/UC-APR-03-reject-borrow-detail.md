# UC-APR-03 — Reject Borrow Detail / Từ chối detail mượn

**Source:** `US-F04-03` · **FR:** `FR-F04-03`, `FR-F04-05` · **Status:** Planned

## Goal

Record a rejection decision and a reason for one pending asset request.

## Actor and preconditions

- Primary actor: user authorized to reject.
- The user is authenticated and has `borrow_request.reject`.
- The detail is `PENDING`.

## Trigger

The reviewer rejects a pending detail and enters a reason.

## Main flow

1. The reviewer enters a rejection reason and submits the decision.
2. The system validates permission, pending status and reason.
3. The system changes the detail to `REJECTED`.
4. The system records the reviewer, processing time and rejection reason.
5. The system derives the request header status.
6. The system returns the updated detail/result.

## Alternative and exception flows

- The reason is missing: reject the command with validation feedback.
- The detail is no longer `PENDING`: reject repeat processing.
- Permission is absent: deny the action.

## Postconditions

The detail is `REJECTED`; the asset status is unchanged.

## Acceptance criteria

- `AC-US-F04-03-01`: Given detail `PENDING`, when từ chối với lý do hợp lệ, then detail thành `REJECTED`.
- `AC-US-F04-03-02`: Then hệ thống ghi người, thời điểm và lý do từ chối.
- `AC-US-F04-03-03`: Given thiếu lý do, when từ chối dữ liệu mới, then hệ thống không hoàn tất thao tác.
- `AC-US-F04-03-04`: Given detail không còn `PENDING`, then hệ thống từ chối xử lý lại.
- `AC-US-F04-03-05`: Then asset không bị chuyển status do thao tác từ chối một detail chưa được duyệt.

## Business rules

`BR-BOR-03`, `BR-BOR-04`, `BR-BOR-13`, `BR-BOR-14`, `BR-BOR-15`.
