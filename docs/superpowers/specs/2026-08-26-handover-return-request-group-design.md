# Handover & Return request-level fulfillment groups

Status: Implemented and verified

## Problem

`Handover & Return` currently presents one top-level queue row per
`borrow_request_detail`. A multi-asset borrow request therefore appears as
several unrelated rows even though the employee submitted one request/cart.
This differs from `Approval Queue`, whose top-level record is the borrow
request with its details underneath.

The change is a presentation and queue-read-model change. The domain remains
request -> request detail -> borrow history. Handover and return mutations
remain asset/history-level operations.

## Decisions

- Keep `Handover & Return` as a separate fulfillment screen. It must not be
  embedded into `Approval Queue`, because approval uses different permissions
  and approval is not physical handover.
- Keep the two tabs `Pending Handover` and `Pending Return` because checkout
  and checkin are independent capabilities and the two actions have different
  operational meaning.
- Both tabs use request-level top-level groups. Queue rows show request
  context, progress and counts only; child assets/histories and their actions
  are handled on the corresponding detail page.
- Keep individual handover at
  `POST /borrow-request-details/:detailId/handover`; this path continues to
  support optional per-history evidence.
- Add `GET /borrow-request-details/handover-queue/:requestId` so an
  admin/manager can open one request context before confirming handover.
- Evidence is captured in the individual detail action so it can be attached
  to the correct history; media cannot be reused across multiple histories
  under BR-MED-06.
- Do not add bulk handover in this MVP. Handover remains an individual detail
  action so evidence can be captured and attached to the correct history.
- A successful individual handover emits the existing
  `borrow_history.handed_over` event once. No new notification event type is
  introduced.
- No Prisma schema migration is required.

## Queue response design

The existing handover and return queue paths are retained to avoid unnecessary
route and permission churn, but their response items become request-level.
Pagination and `total` count requests, not child details or histories.

Handover group:

```ts
type HandoverQueueRequest = {
  requestId: number
  requestCreatedAt: string
  requester: RequesterSummary
  pendingCount: number
  approvedCount: number
  handedOverCount: number
  items: HandoverQueueItem[]
}
```

`items` contains eligible `APPROVED` details whose asset is `RESERVED` and
whose detail has no borrow history. The counts provide request progress when
some approved details have already been handed over.

Return group:

```ts
type ReturnQueueRequest = {
  requestId: number
  requestCreatedAt: string
  requester: RequesterSummary
  pendingCount: number
  returnedCount: number
  items: BorrowHistory[]
}
```

`items` contains unreturned histories only. Return actions remain per history;
bulk return is not part of this change.

## Handover detail contract

`GET /api/borrow-request-details/handover-queue/:requestId` requires
`asset.checkout` and returns the same request group shape as the queue. The
response keeps approved/handed-over progress and returns only actionable
`APPROVED` details whose asset is `RESERVED` and has no history. A request
that does not exist returns `404`; state conflicts during confirmation use the
existing individual handover `409` behavior.

## Return detail contract

`GET /api/borrow-histories/return-queue/:requestId` requires `asset.checkin` and
returns the same request group shape as the return queue. The response keeps
returned/pending progress and returns only histories without `return_date`.
A request that does not exist returns `404`; state conflicts during normal or
damaged return use the existing individual return `409` behavior.

## UI behavior

- Render one compact grouped request row per request with request ID, requester,
  department, request date and pending/approved/returned progress. Do not
  render the full child asset/history list in the queue; show counts and one
  clear detail action.
- Handover Detail shows requester context, progress, canonical asset identity,
  expected return date and an individual `Confirm handover` action for each
  ready asset.
- Confirm opens the shared evidence picker in the detail context. Evidence is
  optional under the current media contract, but the UI makes capture available
  before the physical confirmation.
- After individual success or conflict, reload the detail from the server. A
  handed-over asset disappears from the actionable list and the progress
  counters update.
- Approval Detail links directly to `/handover-return/:requestId`.
- Return Detail shows requester context, progress, canonical asset identity,
  borrower/history metadata and individual normal/damaged return actions for
  each pending history. A returned history disappears after refresh.
- Loading, empty, error/retry, forbidden, pending mutation, conflict and
  success states remain explicit. Queue state is never cached as authoritative.
- Desktop uses compact grouped table/list content; mobile uses stacked request
  summaries with full-width detail actions. Detail pages use the full asset or
  history list and full-width touch actions where needed.

## Verification

Backend:

- Typecheck and production build.
- Unit coverage for handover and return detail repository delegation and
  per-detail atomic handover/return/event behavior.
- MariaDB lifecycle integration coverage for multi-asset request grouping,
  request-level pagination, handover/return detail loading, individual handover
  and return actions, and duplicate protection.

Frontend:

- Component coverage for compact grouped response rendering, handover/return
  detail navigation, individual evidence/confirm actions, stale reloads and
  permission tabs.
- Production build and responsive static audit.

Repository:

- Update OpenAPI, API catalog, borrow lifecycle contract, frontend flow/screen
  spec and durable implementation memory.
- Complete notification checklist WFL-01 only after event transaction tests
  pass and add command evidence.
- Run the repository verification selector and `git diff --check`.
