# F03–F05 Borrow Lifecycle API Contract

Status: `READY` and implemented. Business timezone: `Asia/Ho_Chi_Minh`.
Authorization is based on effective permission codes. Role names are not
checked by the API. `view_all` is company-wide for this MVP; `department_id`
does not create an authorization scope.

## Common conventions

- Success envelope: `{ "data": ... }`.
- Error envelope: `{ "error": string, "details"?: object }`.
- List query defaults: `page=1`, `pageSize=20`; maximum `pageSize=100`.
- Page DTO: `{ "items": [], "page": number, "pageSize": number, "total": number }`.
- List/history order: newest first. Review Queue: oldest first.
- `expectedReturnDate` is date-only `YYYY-MM-DD`, interpreted in
  `Asia/Ho_Chi_Minh`, and must be today or later.
- `note` and `rejectionReason` allow at most 2,000 characters.
- Expected errors: `400` invalid input, `401` unauthenticated, `403` missing
  permission, `404` missing/hidden own resource, `409` state/concurrency conflict.

## F03 — Borrow Request

### Create a multi-asset request

`POST /api/borrow-requests` — `borrow_request.create`

```json
{
  "note": "For project work",
  "items": [
    { "assetId": 12, "expectedReturnDate": "2026-08-20", "note": null },
    { "assetId": 13, "expectedReturnDate": "2026-08-22" }
  ]
}
```

Returns `201` with the created request and `PENDING` details. Selected assets
must exist and be `AVAILABLE`, duplicates are rejected, and asset status stays
`AVAILABLE` until approval. Multiple pending requests may reference the same
available asset.

### Read own requests

- `GET /api/borrow-requests/me?page=&pageSize=&status=` —
  `borrow_request.view_own`; returns a page of own requests.
- `GET /api/borrow-requests/:requestId` — `borrow_request.view_own`; returns
  the request only when owned by the current user, otherwise `404`.
- `POST /api/borrow-requests/:requestId/cancel` —
  `borrow_request.cancel_own`; cancels the owner's request when no handover has
  happened and releases its reserved assets. This endpoint covers US-F03-04.

## F04 — Approval and reservation

- `GET /api/borrow-request-details/review-queue?page=&pageSize=` —
  `borrow_request.view_all`; company-wide page containing requests with at
  least one `PENDING` detail, oldest first.
- `POST /api/borrow-request-details/:detailId/approve` —
  `borrow_request.approve`; empty body. Atomically changes the detail
  `PENDING → APPROVED` and asset `AVAILABLE → RESERVED`. Returns
  `{ "data": { "detailId": number, "approvalStatus": "APPROVED" } }`.
- `POST /api/borrow-request-details/:detailId/reject` —
  `borrow_request.reject`; body `{ "rejectionReason": "..." }`. Changes only
  the pending detail and records reviewer/time/reason; asset status is unchanged.
  Returns `{ "data": { "detailId": number, "approvalStatus": "REJECTED" } }`.
- `POST /api/borrow-requests/:requestId/approve-all` —
  `borrow_request.approve`; empty body. Processes every currently pending detail
  using the same atomic reservation transaction as single-detail approval.
  Eligible details become `APPROVED`; conflicts remain `PENDING`. The response
  contains `approved` and `skipped` arrays so clients can present partial success.

Concurrent approvals for the same asset permit only one success. Reprocessing
a non-pending detail returns `409`.

## F05 — Handover, normal return and history

- `POST /api/borrow-request-details/:detailId/handover` — `asset.checkout`;
  empty body. Atomically changes `RESERVED → BORROWED` and creates exactly one
  borrow history using the request owner as borrower. Returns
  `{ "data": { "historyId": number } }`.
- `GET /api/borrow-histories/current?page=&pageSize=` —
  `borrow_history.view_own`; current unreturned assets of the current user.
- `POST /api/borrow-histories/:historyId/return` — `asset.checkin`; empty body.
  Atomically records receiver/time, writes canonical `returnCondition=NORMAL`,
  and changes asset `BORROWED → AVAILABLE`. The client cannot submit a return
  condition for a normal return. Returns
  `{ "data": { "historyId": number, "returned": true } }`.
- `GET /api/borrow-histories/me?page=&pageSize=` —
  `borrow_history.view_own`; the current user's history.
- `GET /api/borrow-histories?page=&pageSize=` —
  `borrow_history.view_all`; company-wide history for this MVP.

History responses use camelCase and include asset, borrower, expected return
date, handover actor/time and return actor/time/condition. When all approved
details have been returned and no detail remains pending, the request becomes
`COMPLETED`. Damaged return is outside this contract.

## Shared response shapes

```ts
type BorrowRequestStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'PARTIALLY_APPROVED' | 'COMPLETED' | 'CANCELLED'

type BorrowDetailStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

type BorrowHistory = {
  id: number
  detailId: number
  asset: {
    id: number
    serialNumber: string | null
    qrCode: string
    status: string
    model: { id: number; name: string }
  }
  borrower: { id: number; name: string }
  expectedReturnDate: string
  handedOverBy: { id: number; name: string } | null
  borrowedAt: string
  receivedBy: { id: number; name: string } | null
  returnedAt: string | null
  returnCondition: 'NORMAL' | null
}
```

## Explicit exclusions

- Damaged return and automatic Asset Issue creation.
- Department-scoped visibility.
- Notification and frontend implementation.
