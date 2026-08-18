# US-F08-03 – Update a user

## User Story

As an **Admin**,\
I want to **edit internal account information**,\
so that **staff data remains accurate**.

## Acceptance Criteria

- AC-US-F08-03-01: Given a valid user and department, when updating, then the system saves the new information, including a newly claimed `avatarMediaId` or legacy `avatarUrl` when provided.
- AC-US-F08-03-07: Avatar replacement and the user FK update are atomic; the previous media remains immutable and is eligible for detached-replacement cleanup only when no reference remains.
- AC-US-F08-03-02: Given the email or phone matches another user, then the system rejects the request.
- AC-US-F08-03-03: Given the department does not exist, then the system rejects the request.
- AC-US-F08-03-04: Then the result does not contain the password.
- AC-US-F08-03-05: Self-service profile updates use dedicated APIs and do not grant users permission to change department, roles, status, or user code.
- AC-US-F08-03-06: The information update endpoint does not change `isActive`; status changes require the separate `user.manage_status` capability.

## Applicable Business Rules

`BR-USR-01`, `BR-USR-02`, `BR-USR-04`.

## Related Functional Requirements

`FR-F08-03`.
