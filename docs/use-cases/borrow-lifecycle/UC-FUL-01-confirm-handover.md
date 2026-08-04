# UC-FUL-01 — Confirm Handover / Xác nhận bàn giao

**Source:** `US-F05-01` · **FR:** `FR-F05-01`, `FR-F05-02` · **Status:** Planned

## Goal

Record that a reserved asset was physically handed over to its requester.

## Actor and preconditions

- Primary actor: user authorized to hand over assets.
- The user is authenticated and has `asset.checkout`.
- The detail is `APPROVED` and its asset is `RESERVED` for that detail.
- No borrow history exists for the detail.

## Trigger

The handover operator confirms delivery of the reserved asset.

## Main flow

1. The operator selects a reserved approved detail and confirms handover.
2. The system validates permission, detail status, reservation and history absence in one transaction.
3. The system changes the asset from `RESERVED` to `BORROWED`.
4. The system creates exactly one borrow history with the handover operator and time.
5. The system identifies the borrower from the request owner; no borrower input is accepted.
6. The system returns the new borrow history.

## Alternative and exception flows

- A history already exists: reject the repeat handover.
- The asset is no longer reserved for the detail: reject without partial history/status updates.
- Permission is absent: deny the action.

## Postconditions

The asset is `BORROWED` and exactly one history records the physical handover.

## Acceptance criteria

- `AC-US-F05-01-01`: Given detail `APPROVED` và asset `RESERVED` cho đúng detail, when xác nhận, then asset chuyển `BORROWED`.
- `AC-US-F05-01-02`: Then hệ thống tạo một borrow history ghi người và thời điểm bàn giao.
- `AC-US-F05-01-03`: Given detail đã có borrow history, when xác nhận lại, then hệ thống từ chối tạo lịch sử thứ hai.
- `AC-US-F05-01-04`: Given asset không còn `RESERVED` cho detail, then không có history hoặc status nào bị ghi một phần.
- `AC-US-F05-01-05`: Người mượn được xác định từ request, không yêu cầu nhập lại.

## Business rules

`BR-HAN-01`, `BR-HAN-02`, `BR-HAN-03`, `BR-HAN-04`, `BR-HAN-05`, `BR-HAN-06`.
