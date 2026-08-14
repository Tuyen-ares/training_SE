# US-F01-05 – Submit an account registration request

## User Story

As a **Guest**,\
I want to **submit a registration request with basic personal information**,\
so that **an authorized person can review it before I access the system**.

## Acceptance Criteria

- AC-US-F01-05-01: Given valid information, when the user submits the registration form, then the system creates a `PENDING` request, does not create a session, and indicates that the request is awaiting review.
- AC-US-F01-05-02: The registration form does not allow the user to select a role or department.
- AC-US-F01-05-03: An email address or phone number can have at most one `PENDING` request, including when multiple requests are submitted concurrently.
- AC-US-F01-05-04: When a request is rejected, its pending key is cleared so the applicant can register again.

## Applicable Business Rules

`BR-AUTH-05`, `BR-AUTH-07`, `BR-USR-01..02`.

## Related Functional Requirements

`FR-F01-06`.
