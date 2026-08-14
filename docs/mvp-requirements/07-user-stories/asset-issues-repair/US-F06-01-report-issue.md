# US-F06-01 – Report an issue

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **record a problem with an asset**,\
so that **the responsible person can verify and handle it**.

## Acceptance Criteria

- AC-US-F06-01-01: Given a valid asset and a non-empty description, when submitting the report, then the system creates the issue with status `REPORTED`.
- AC-US-F06-01-02: Then the system records the reporter and creation time.
- AC-US-F06-01-03: Then the asset does not automatically become `DAMAGED`.
- AC-US-F06-01-04: Given the asset does not exist, when reporting the issue, then the system rejects the request.
- AC-US-F06-01-05: A borrower may report an issue only for an asset they currently borrow; a user with issue permission may report according to the permitted scope.

## Applicable Business Rules

`BR-ISS-01`, `BR-AST-04`.

## Related Functional Requirements

`FR-F06-01`.
