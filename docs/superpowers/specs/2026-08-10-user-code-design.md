# User Code Design

Date: 2026-08-10
Status: Proposed for implementation
Scope: User identity code across database, backend APIs and frontend displays.

## Decision

Every user has an immutable `user_code` with this format:

```text
[BI][YY][Sequence]
```

Examples:

```text
BI26001
BI26002
BI27001
```

- `BI` is the fixed BigIn prefix.
- `YY` is the two-digit year in which the account was created and the code was
  first issued. It is not the employee's employment start year.
- `Sequence` is scoped to the full calendar year in the
  `Asia/Ho_Chi_Minh` timezone.
- The sequence is displayed with at least three digits and expands naturally
  after `999` (`BI261000`, for example).
- Sequences reset for a new year: the first code in 2027 is `BI27001`.
- `user_code` is unique, not null, immutable, never reused after a successful
  issuance, and is not a primary key or foreign key.
- Deactivate/reactivate operations do not change the code.

No `joinedDate` or `joinedYear` field is added.

## Legacy backfill

The migration assigns all existing users the migration year `2026`, ordered by
`users.id ASC`:

```text
BI26001, BI26002, ...
```

The 2026 sequence is initialized to the final backfilled sequence. New 2026
accounts continue from that value. A failed transaction does not count as an
issued code because sequence allocation and user creation occur in one
transaction.

## Database design

Add `users.user_code` as a `VARCHAR` column with `NOT NULL` and a unique index.
The column has no relationship to `users.id` beyond being a business identity
field; it is not used as a primary key or foreign key.

Add a year-scoped sequence table:

```text
user_code_sequences
- year: full calendar year, primary key
- last_sequence: last successfully allocated sequence for that year
```

The migration creates the 2026 sequence row after backfill. Runtime allocation
ensures the current year's row exists, increments it atomically, reads the new
value, and builds `BI` + two-digit year + at-least-three-digit sequence inside
the existing user-creation transaction.

## Backend contract

Expose `userCode` in:

- User list and user detail responses.
- Login and refresh authenticated-user responses.
- Borrow request requester data used by review/approval details.

Create and update inputs do not accept `userCode`; the server owns allocation
and immutability. Deactivate/reactivate responses preserve the same value.

## Frontend behavior

- User List displays the API's `userCode` instead of deriving a fake code from
  the numeric database ID.
- Approval Details keeps the `EMPLOYEE ID` label and displays
  `request.requester.userCode`.
- If the API is missing the field, the UI may show its existing fallback, but
  the implemented API path must provide the value for every persisted user.

## Documentation and verification

Update the F08 requirements, user stories, administration flow, API/OpenAPI
contract, and approval-details frontend flow. Add coverage for:

- Legacy backfill order and 2026 sequence continuation.
- New account allocation in the current year.
- New-year sequence reset.
- Concurrent allocation uniqueness.
- Code preservation across update and deactivate/reactivate.
- User List and Approval Details receiving and rendering `userCode`.

Do not apply a destructive database reset. The migration must be deployable to
the existing database with its legacy users intact.
