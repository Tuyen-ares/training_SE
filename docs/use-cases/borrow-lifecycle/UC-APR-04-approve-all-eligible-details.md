# UC-APR-04 — Approve All Eligible Details / Duyệt tất cả detail đủ điều kiện

**Source:** `US-F04-04` · **FR:** `FR-F04-04`, `FR-F04-05`, `FR-F04-06` · **Status:** Deferred

## Goal

Allow a reviewer to process many pending details quickly without double-reserving an asset.

## Actor and preconditions

- Primary actor: user authorized to approve.
- The user is authenticated and has `borrow_request.approve`.
- The selected request has one or more `PENDING` details.

## Trigger

The reviewer selects **Approve All** for a request.

## Main flow

1. The reviewer starts Approve All.
2. The system evaluates each `PENDING` detail independently.
3. For every eligible detail, the system performs the atomic approval/reservation behavior of `UC-APR-02`.
4. For every ineligible detail, the system keeps it `PENDING` and records a result reason.
5. The system does not roll back successful details because another detail fails.
6. The system derives the request header status and returns per-detail results.

## Alternative and exception flows

- No detail is eligible: return a result containing no successful approval.
- A detail conflicts with another reservation: keep it `PENDING` and report that conflict.
- Permission is absent: deny the whole command before processing.

## Postconditions

Each successful detail is `APPROVED` with an asset `RESERVED`; unsuccessful details remain `PENDING`.

## Acceptance criteria

- `AC-US-F04-04-01`: Given phiếu có nhiều detail `PENDING`, when Approve All, then hệ thống kiểm tra và xử lý từng detail.
- `AC-US-F04-04-02`: Detail có asset `AVAILABLE` được chuyển `APPROVED` và asset chuyển `RESERVED`.
- `AC-US-F04-04-03`: Detail có asset không còn đủ điều kiện vẫn `PENDING` và trả về lý do không duyệt được.
- `AC-US-F04-04-04`: Thất bại của một detail không rollback các detail khác đã duyệt thành công trong bulk action.
- `AC-US-F04-04-05`: Given có detail thành công và còn detail khác trạng thái, then header là `PARTIALLY_APPROVED`.
- `AC-US-F04-04-06`: Mỗi detail thành công vẫn phải thỏa ràng buộc nguyên tử và chống double approval.

## Business rules

`BR-BOR-06`, `BR-BOR-10`, `BR-BOR-11`, `BR-BOR-12`, `BR-BOR-15`.
