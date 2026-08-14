# US-F01-01 – Log in

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **log in using my credentials**,\
so that **I can access the functions I am authorized to use**.

## Acceptance Criteria

- AC-US-F01-01-01: Given an active account and correct credentials, when logging in, then the system authenticates successfully and creates a session.
- AC-US-F01-01-02: Given an incorrect email or password, when logging in, then the system rejects the attempt with a generic authentication message.
- AC-US-F01-01-03: Given an inactive account, when logging in, then the system does not create a session.
- AC-US-F01-01-04: Then the response data does not contain the password or password hash.

## Applicable Business Rules

`BR-AUTH-01`, `BR-AUTH-02`, `BR-USR-02`.

## Related Functional Requirements

`FR-F01-01`, `FR-F01-02`.
