# US-F08-04 – Activate or deactivate a user

## User Story

As an **Admin**,\
I want to **activate or deactivate an account**,\
so that **I can control access while preserving business history**.

## Acceptance Criteria

- AC-US-F08-04-01: Given the user is active, when valid deactivation is performed, then the user becomes inactive.
- AC-US-F08-04-02: Then an inactive user cannot log in or refresh a new session.
- AC-US-F08-04-03: Then the user's requests, history, issues, and related data are retained.
- AC-US-F08-04-04: Given the user is inactive, when valid reactivation is performed, then the user can log in with valid credentials.
- AC-US-F08-04-05: Given the user lacks permission, then the user's status does not change.

## Applicable Business Rules

`BR-USR-03`, `BR-AUTH-01`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F08-04`, `FR-F08-07`.
