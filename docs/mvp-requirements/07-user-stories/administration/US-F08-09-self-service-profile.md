# US-F08-09 – Manage own profile and password

## User Story

As an authenticated **user**,\
I want to **view and update my own profile and password**,\
so that my contact information and account security remain current.

## Acceptance Criteria

- AC-US-F08-09-01: When opening Profile from the authenticated avatar dropdown, the system displays only the current user's profile.
- AC-US-F08-09-02: The user may update their name, phone number, and optional avatar URL; email, department, user code, roles, and active status are read-only.
- AC-US-F08-09-03: A duplicate phone number or invalid profile field is rejected without changing the profile.
- AC-US-F08-09-04: Changing the password requires the current password and a valid new password; an incorrect current password is rejected.
- AC-US-F08-09-05: After a successful password change, refresh-token sessions are revoked and the user must sign in again.
- AC-US-F08-09-06: Profile and password responses never contain a password, password hash, refresh token, or access token.
- AC-US-F08-09-07: Self-service APIs cannot change department, roles, active status, or user code.

## Applicable Business Rules

`BR-USR-01`, `BR-USR-02`, `BR-USR-05`, `BR-USR-06`.

## Related Functional Requirements

`FR-F08-16`, `FR-F08-17`.
