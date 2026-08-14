# US-F01-03 – Log out

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **log out of the current session**,\
so that **the session can no longer access my account**.

## Acceptance Criteria

- AC-US-F01-03-01: Given a valid session, when logging out, then the system confirms the logout.
- AC-US-F01-03-02: When refreshing with information from a logged-out session, then the system rejects the request.
- AC-US-F01-03-03: Given an expired or logged-out session, when logging out again, then the system does not create a new session or change business data.

## Applicable Business Rules

`BR-AUTH-04`.

## Related Functional Requirements

`FR-F01-04`.
