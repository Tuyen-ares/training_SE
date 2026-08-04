# UC-FUL-04 — View My Borrow History / Xem lịch sử mượn của tôi

**Source:** `US-F05-04` · **FR:** `FR-F05-05` · **Status:** Planned

## Goal

Allow an employee to review the employee's past and open asset borrowing records.

## Actor and preconditions

- Primary actor: employee.
- The user is authenticated and has `borrow_history.view_own`.

## Trigger

The employee opens **My Borrow History**.

## Main flow

1. The employee opens the history list.
2. The system checks the ownership-view permission.
3. The system finds histories connected through request details to requests of the current user.
4. The system returns asset, handover date, return date and return condition where present.
5. The system distinguishes open histories from returned histories.

## Alternative and exception flows

- No history exists: return an empty list.
- Permission is absent: deny access.

## Postconditions

No history data can be changed through this read use case.

## Acceptance criteria

- `AC-US-F05-04-01`: When mở lịch sử của tôi, then chỉ các history truy về request của user hiện tại được hiển thị.
- `AC-US-F05-04-02`: Then mỗi history thể hiện asset, ngày bàn giao, ngày trả và tình trạng trả khi có.
- `AC-US-F05-04-03`: History chưa trả được phân biệt rõ với history đã hoàn trả.
- `AC-US-F05-04-04`: User không thể đổi dữ liệu history từ chức năng xem.

## Business rules

`BR-HAN-03`, `BR-HAN-06`, `BR-RET-03`.
