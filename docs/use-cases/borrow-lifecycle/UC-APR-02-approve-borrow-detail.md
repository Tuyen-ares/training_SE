# UC-APR-02 — Approve Borrow Detail and Reserve Asset / Duyệt detail và giữ chỗ asset

**Source:** `US-F04-02` · **FR:** `FR-F04-02`, `FR-F04-05`, `FR-F04-06` · **Status:** Planned

## Goal

Approve one pending request detail while reserving its asset safely.

## Actor and preconditions

- Primary actor: user authorized to approve.
- The user is authenticated and has `borrow_request.approve`.
- The detail is `PENDING`; the target asset is `AVAILABLE` at execution time.

## Trigger

The reviewer approves a pending detail.

## Main flow

1. The reviewer selects **Approve** for a pending detail.
2. The system rechecks permission, detail status and asset status in one transaction.
3. The system changes the detail to `APPROVED` and records handler/time.
4. The system changes the asset from `AVAILABLE` to `RESERVED`.
5. The system derives the request header status.
6. The system returns the updated detail/result.

## Alternative and exception flows

- The asset is no longer `AVAILABLE`: return a conflict; keep the detail `PENDING`.
- The detail is no longer `PENDING`: reject repeat processing.
- Two reviewers approve details for the same asset concurrently: exactly one transaction succeeds.
- Any operation in the transaction fails: keep both detail and asset at their prior state.

## Postconditions

One detail is `APPROVED`; its asset is `RESERVED`; the decision is auditable.

## Acceptance criteria

- `AC-US-F04-02-01`: Given detail `PENDING` và asset `AVAILABLE`, when duyệt, then detail thành `APPROVED` và asset thành `RESERVED`.
- `AC-US-F04-02-02`: Then hệ thống ghi người và thời điểm xử lý detail.
- `AC-US-F04-02-03`: Given asset không còn `AVAILABLE`, when duyệt, then hệ thống báo xung đột và detail vẫn `PENDING`.
- `AC-US-F04-02-04`: Given hai người đồng thời duyệt các detail giữ cùng asset, then chỉ một thao tác thành công.
- `AC-US-F04-02-05`: Given bất kỳ phần nào của thao tác thất bại, then detail và asset đều giữ trạng thái trước thao tác.

## Business rules

`BR-BOR-03`, `BR-BOR-06`, `BR-BOR-07`, `BR-BOR-08`, `BR-BOR-10`.
