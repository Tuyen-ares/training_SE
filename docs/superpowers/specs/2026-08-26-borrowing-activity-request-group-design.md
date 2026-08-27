# Borrowing Activity Request-Grouped Table Design

## Decision

Keep `Borrowing Activity` as one screen with two independent tabs:

- `Currently Borrowed`
- `Returned History`

Each tab is paginated by `borrow request`, not by individual borrow history.
The primary surface is the shared `AppTable`, with one top-level row per
request. A request row can expand into a second table containing the matching
asset histories. A request may appear in both tabs when its assets were
returned at different times; each tab only renders child histories matching
that tab's state.

The request row does not display a status badge. The asset row remains the
place where the canonical asset status is inspected through the existing
history detail screen. No new persisted status is introduced.

## Why

A borrow request is the user's basket and is already the parent of every
request detail and borrow history. Rendering one top-level row per history
repeats the same request context and can split one request across pagination
boundaries. The operational queues and Approval Queue already use request-level
`AppTable` rows, so Borrowing Activity must use the same table hierarchy and
spacing while keeping asset details collapsed until requested.

## API

Use the existing grouped read endpoints:

```text
GET /api/borrow-histories/activity/me?page=&pageSize=&state=CURRENT|RETURNED
  requires borrow_history.view_own

GET /api/borrow-histories/activity?page=&pageSize=&state=CURRENT|RETURNED
  requires borrow_history.view_all
```

Both endpoints return `ApiEnvelope<Page<BorrowingActivityRequestGroupDto>>`.
Pagination and `total` count request groups. Requests are ordered by
`created_at DESC, id DESC`; child histories are ordered by request detail ID
ascending. The backend applies the state filter before selecting child rows:

- `CURRENT`: `borrow_histories.return_date IS NULL`.
- `RETURNED`: `borrow_histories.return_date IS NOT NULL`.

The response shape is:

```ts
type BorrowingActivityRequestGroupDto = {
  requestId: number
  requestCreatedAt: string
  requester: BorrowRequesterDto
  itemCount: number
  items: BorrowHistoryDto[]
}
```

The `requester` object follows the existing safe requester summary shape. No
request or activity status is added to this response. Each child keeps the
existing asset status, dates, return condition, actors and typed evidence
fields so the existing history detail route remains the source for full asset
inspection.

No database schema or migration change is required. The grouping uses the
existing relation `borrow_requests -> borrow_request_details ->
borrow_histories`.

## Frontend behavior

`BorrowingActivityView` calls the grouped own endpoint unless the user has
`borrow_history.view_all`, in which case it calls the grouped all endpoint.
Changing tabs reloads page one and preserves the two-tab model.

### Primary request table

The page renders the common `AppTable` with standard table header titles and
pagination. The top-level columns are:

- `Request`: request ID and created date;
- `Requester`: name, user code and department when available;
- `Assets`: number of matching histories in the selected tab;
- `Activity`: current due/hand-over summary or returned/hand-over summary;
- `Action`: expand or collapse the request's asset table.

The `Activity` column may emphasize `Overdue`, `Due soon` or `On track` for
currently borrowed assets, but this is due-date information, not a request
status. No request-level status column is rendered.

### Expanded asset table

The default request table remains compact. The standard table expand control or
the request action opens a nested `AppTable` for that request. The nested table
keeps explicit column titles and renders one row per matching history.

For `Currently Borrowed`, the columns are:

- `Asset` (model, code and serial number);
- `Handover`;
- `Expected return` with due-date emphasis;
- `Action` linking to the existing history detail route.

For `Returned History`, the columns are:

- `Asset` (model, code and serial number);
- `Handover`;
- `Returned`;
- `Condition` and receiver when available;
- `Action` linking to the existing history detail route.

The child row does not repeat `BORROWED` or `RETURNED`; the selected tab scopes
the data and canonical asset status remains available in detail.

Groups are collapsed by default to control vertical density. Expanding one
request does not expand other requests. Mobile uses the existing `AppTable`
stacked-row pattern and exposes the same request summary plus a compact
expandable asset list; it does not create a second business workflow.

Required states remain loading, empty per tab, recoverable error with retry,
forbidden/not-found through existing route handling, and pagination by request
group through the shared table footer.

## Acceptance criteria

- Employee with `borrow_history.view_own` can see only own current or returned
  histories through the matching tab.
- A user with `borrow_history.view_all` can see grouped company-wide history.
- The primary surface is the shared `AppTable` and has titled columns matching
  the common list screens.
- A request containing multiple matching histories renders once per page with
  all matching histories in its expandable child table.
- A request can appear in both tabs when it has both current and returned
  histories, without showing the wrong-state child in either tab.
- Pagination `total` counts request groups, so one request is never split
  between pages.
- No group status badge or new persisted status is introduced.
- Existing asset-level history detail navigation and permission behavior remain
  unchanged.
- Existing dashboard asset-level history consumers remain compatible.

## Verification

- Backend grouped endpoint coverage remains green for own/all scope, state
  filtering, request-level pagination and child ordering.
- Frontend view tests cover the shared table surface, request grouping, tab
  switching, expansion affordance, detail navigation and error retry.
- Frontend production build and responsive static audit pass.