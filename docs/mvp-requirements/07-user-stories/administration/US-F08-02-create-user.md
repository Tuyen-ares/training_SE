# US-F08-02 – Create a user

## User Story

As an **Admin**,\
I want to **create an internal account**,\
so that **staff can access the system according to their assigned roles**.

## Acceptance Criteria

- AC-US-F08-02-01: Given the required data and a valid department, when creating the user, then the system creates an active user and automatically assigns a unique user code in the format `BI[YY][Sequence]`; avatar is optional via `avatarMediaId`, with legacy `avatarUrl` retained as fallback.
- AC-US-F08-02-07: When `avatarMediaId` is provided, the server claims READY USER_AVATAR media and links it atomically with user creation.
- AC-US-F08-02-02: Given the email or phone already exists, then the system rejects the request.
- AC-US-F08-02-03: Given the department does not exist, then the system rejects the request.
- AC-US-F08-02-04: Then the password is not returned in the result.
- AC-US-F08-02-05: Given the user lacks permission, then no user is created.
- AC-US-F08-02-06: The user code is not entered by the client, does not change when the user is updated or activated/deactivated, and is not reused.

## Applicable Business Rules

`BR-USR-01`, `BR-USR-02`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F08-02`, `FR-F08-07`.
