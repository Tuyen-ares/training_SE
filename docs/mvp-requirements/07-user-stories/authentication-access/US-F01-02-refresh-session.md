# US-F01-02 – Refresh session

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **refresh a valid session**,\
so that **I can continue working without repeatedly logging in**.

## Acceptance Criteria

- AC-US-F01-02-01: Given a valid refresh token, when a refresh is requested, then the system issues a new access session.
- AC-US-F01-02-02: Given a refresh token that has been used, revoked, or expired, when refreshing, then the system rejects the request.
- AC-US-F01-02-03: Given an inactive user, when refreshing, then the system rejects issuing a new session.
- AC-US-F01-02-04: Then the new session reflects the permissions in effect at the time it is issued.

## Applicable Business Rules

`BR-AUTH-01`, `BR-AUTH-03`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F01-02`, `FR-F01-03`.
