# UC-FUL-05 — View All Borrow History / Xem toàn bộ lịch sử mượn

**Source:** `US-F05-05` · **FR:** `FR-F05-05` · **Status:** Planned

## Goal

Allow an authorized user to investigate borrowing records in the permitted scope.

## Actor and preconditions

- Primary actor: user authorized to view all borrow history.
- The user is authenticated and has `borrow_history.view_all`.

## Trigger

The authorized user opens the all-history view.

## Main flow

1. The actor opens the all-history list and may apply supported filters.
2. The system checks the all-history permission.
3. The system queries histories in the permitted scope.
4. The system returns each asset, linked requester/borrower, handover operator and return receiver.
5. The actor inspects records as stored in history, not inferred only from approval status.

## Alternative and exception flows

- No history matches: return an empty list.
- The user lacks all-history permission: deny access and do not disclose another user's record.
- The exact organizational scope is an open contract decision; the requirement currently says “phạm vi được cấp”.

## Postconditions

No business data is changed.

## Acceptance criteria

- `AC-US-F05-05-01`: Given có permission, when mở lịch sử, then hệ thống hiển thị các bản ghi thuộc phạm vi được phép.
- `AC-US-F05-05-02`: Then có thể nhận biết người mượn qua phiếu, người bàn giao và người nhận trả.
- `AC-US-F05-05-03`: Given thiếu permission xem toàn bộ, then user không truy cập được lịch sử của người khác.
- `AC-US-F05-05-04`: Dữ liệu hiển thị phản ánh history đã ghi, không suy ra bàn giao chỉ từ approval status.

## Business rules

`BR-HAN-03`, `BR-HAN-05`, `BR-HAN-06`, `BR-RET-01`.
