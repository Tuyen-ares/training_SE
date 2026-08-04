# Borrow Lifecycle Use Cases / Use Case vòng đời mượn

This folder turns the approved F03–F05 user-story specifications into
implementation-oriented use cases. It does not replace API contracts.

| Module | Use cases | Delivery status |
| --- | --- | --- |
| F03 — Borrow Request | `UC-BOR-01` to `UC-BOR-04` | `UC-BOR-04` deferred |
| F04 — Approval & Reservation | `UC-APR-01` to `UC-APR-04` | `UC-APR-04` deferred |
| F05 — Handover, Return & History | `UC-FUL-01` to `UC-FUL-05` | Normal return is in scope; damaged-return branch deferred |

## Reading order

1. `UC-BOR-01` Create Borrow Request
2. `UC-BOR-02` View My Borrow Requests
3. `UC-BOR-03` View My Borrow Request Detail
4. `UC-APR-01` View Review Queue
5. `UC-APR-02` Approve Borrow Detail and Reserve Asset
6. `UC-APR-03` Reject Borrow Detail
7. `UC-FUL-01` Confirm Handover
8. `UC-FUL-02` View My Current Borrowed Assets
9. `UC-FUL-03` Confirm Normal Return
10. `UC-FUL-04` View My Borrow History
11. `UC-FUL-05` View All Borrow History

Deferred use cases are retained for traceability:

- `UC-BOR-04` Withdraw Borrow Request
- `UC-APR-04` Approve All Eligible Details

## Shared terminology

- **Request header**: a `borrow_request` created by one employee.
- **Request detail**: one requested asset within that request.
- **Approval status**: `PENDING`, `APPROVED` or `REJECTED` on a detail.
- **Borrow history**: the source of truth that an asset was physically handed
  over and later returned.
- **Request status**: derived from its detail/history state; it is not manually
  calculated by the frontend.
