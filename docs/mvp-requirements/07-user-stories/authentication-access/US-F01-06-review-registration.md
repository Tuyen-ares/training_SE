# US-F01-06 – Review registration requests

## User Story

As a **user with `user_registration.review`**, I want to view, approve, or reject registration requests so that accounts are created only for valid applicants.

## Acceptance Criteria

- The queue supports status, search, and pagination; the oldest pending request is displayed first.
- Approval requires a department, allows multiple existing roles, and uses `employee` when roleIds is omitted.
- Approval creates the user, userCode, and roles, links createdUserId, and clears the hash in one transaction.
- Rejection clears the hash; rejectionReason is optional; no user is created.
- A reviewed request cannot be processed a second time.
- A user without `user_registration.review` cannot view or process requests.

## Applicable Business Rules

`BR-AUTH-05..08`, `BR-RBAC-01..03`, `BR-USR-01..02`.

## Related Functional Requirements

`FR-F01-07..09`.
