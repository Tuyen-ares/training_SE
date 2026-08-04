# UC-FUL-03 — Confirm Normal Return / Xác nhận hoàn trả bình thường

**Source:** `US-F05-03` · **FR:** `FR-F05-04`, `FR-F04-05` · **Status:** Planned for normal return; damaged-return branch deferred

## Goal

Record a normal asset return, close the open borrow history and make the asset available again.

## Actor and preconditions

- Primary actor: user authorized to receive returns.
- The user is authenticated and has `asset.checkin`.
- The asset is `BORROWED` and has one unreturned borrow history.

## Trigger

The receiving operator confirms a normal return and its return condition.

## Main flow

1. The operator selects an unreturned history and enters the normal return condition.
2. The system validates permission and confirms that the history has no return date.
3. In one transaction, the system records receiver, return time and return condition.
4. The system changes the asset from `BORROWED` to `AVAILABLE`.
5. The system derives `COMPLETED` for the request when all approved/handed-over details are returned and no pending detail remains.
6. The system returns the updated history.

## Alternative and exception flows

- The history already has a return date: reject the repeat confirmation.
- The asset/history state is inconsistent or an update fails: roll back the whole return transaction.
- A damaged return is not handled by this use case in the current delivery; it belongs to the deferred return-and-issue branch.

## Postconditions

The history is returned and the asset is `AVAILABLE`; the request may become `COMPLETED`.

## Acceptance criteria in current delivery

- `AC-US-F05-03-01`: Given asset `BORROWED` có history chưa trả, when xác nhận trả bình thường, then ghi người nhận, thời điểm và tình trạng trả.
- `AC-US-F05-03-02`: Then asset chuyển `BORROWED → AVAILABLE`.
- `AC-US-F05-03-03`: Given history đã có return date, when xác nhận lại, then hệ thống từ chối.
- `AC-US-F05-03-04`: Given lỗi ở bất kỳ cập nhật nào, then history và asset không bị lưu trạng thái một phần.
- `AC-US-F05-03-05`: Khi mọi lượt được duyệt/bàn giao trong phiếu đã trả, header chuyển `COMPLETED`.

## Deferred acceptance criterion

- `AC-US-F05-03-06`: Given người nhận xác nhận tình trạng `DAMAGED`, when hoàn trả, then history ghi `return_date` và `return_condition = DAMAGED`, issue `CONFIRMED` được tạo và asset chuyển `BORROWED → DAMAGED`.

## Business rules

`BR-RET-01`, `BR-RET-02`, `BR-RET-03`, `BR-BOR-18`, `BR-ISS-08`.
