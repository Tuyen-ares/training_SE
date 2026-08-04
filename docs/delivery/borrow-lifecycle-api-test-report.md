# Borrow Lifecycle API Test Report

Date: 2026-08-04  
Test style: automated real HTTP requests against an ephemeral Express server,
plus a full lifecycle executed with `curl.exe` against the local API and the
configured MariaDB database.

## Scope verified

The new test file is [borrow-lifecycle.integration.test.ts](../../apps/backend/tests/borrow-lifecycle.integration.test.ts). It creates isolated database records, creates signed permission-based access tokens, calls the API over HTTP, asserts each response, verifies database state, then cleans up its records.

| Step | API | Expected result | Result |
| --- | --- | --- | --- |
| Create request | `POST /api/borrow-requests` | Creates a pending request and detail; asset stays `available` | Passed |
| View own requests | `GET /api/borrow-requests/me` | Returns the borrower's requests | Passed |
| View review queue | `GET /api/borrow-request-details/review-queue` | Authorized reviewer can read pending work | Passed |
| Approve detail | `POST /api/borrow-request-details/:detailId/approve` | Detail is approved and asset becomes `reserved` | Passed |
| Reject detail | `POST /api/borrow-request-details/:detailId/reject` | Detail and request become `REJECTED` | Passed |
| Confirm handover | `POST /api/borrow-request-details/:detailId/handover` | Creates borrow history and asset becomes `borrowed` | Passed |
| View current loans | `GET /api/borrow-histories/current` | Borrower can view their unreturned asset | Passed |
| Confirm normal return | `POST /api/borrow-histories/:historyId/return` | Return recorded and asset becomes `available` | Passed |
| View history | `GET /api/borrow-histories/me` and `GET /api/borrow-histories` | Own history and permission-based all-history endpoints respond | Passed |
| Cancel a pending request | `POST /api/borrow-requests/:requestId/cancel` | Request becomes `cancelled` | Passed |

## Curl lifecycle evidence

The curl fixture used two `AVAILABLE` assets and separate bearer tokens for a
borrower and an operator. It was removed from the database after verification.

| Step | Input/result |
| --- | --- |
| Create | Two items with `expectedReturnDate` values `2099-01-01` and `2099-01-02`; HTTP 201 |
| Own list/detail | HTTP 200; response preserved date-only `2099-01-01` |
| Review Queue | `page=1&pageSize=20`; HTTP 200 |
| Approve and reject | First detail approved, second rejected with a reason; both HTTP 200 |
| Handover/current | HTTP 200; history created and current DTO returned `2099-01-01` |
| Normal return | Empty body; HTTP 200; server wrote `returnCondition=NORMAL` |
| Post-return state | Own history showed asset `AVAILABLE` |
| All history | Permission-gated company-wide endpoint returned HTTP 200 |

The automated DB test additionally verifies that ISO datetime input is
rejected, arbitrary normal-return condition input is rejected, duplicate
assets are rejected, missing permissions return 403, repeated state actions
return 409, and concurrent reservation has one winner.

## Defect found and fixed during test

Approval initially returned HTTP 500 because the implementation passed display values such as `APPROVED` to Prisma. The Prisma enum requires its internal value `approved`. `refreshRequestStatus` now writes the correct enum values (`pending`, `approved`, `rejected`, `partially_approved`, `completed`). The full flow then passed.

## Commands and evidence

| Command | Result |
| --- | --- |
| `pnpm --filter backend typecheck` | Passed |
| `pnpm --filter backend test:db` | Passed: 8 tests, 0 failed |
| `pnpm --filter backend build` | Passed |
| `pnpm --filter backend test` | Passed: 35 tests, 0 failed |
| Full lifecycle using `curl.exe` | Passed: 11 API calls, all expected 2xx |

The database suite also passed its existing concurrent asset-reservation check, along with Asset, User, and RBAC integration coverage.

## Not covered by this test

This report does not claim completion for endpoints not implemented in the tested flow, including bulk approval (`US-F04-04`) and the damaged-return branch (`US-F05-03`).
