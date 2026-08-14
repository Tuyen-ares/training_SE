# US-F03-03 – View my request details

## User Story

As an **Employee**,\
I want to **view the status of each asset in my request**,\
so that **I know which assets are pending, approved, or rejected**.

## Acceptance Criteria

- AC-US-F03-03-01: Given the request belongs to the current user, when opening its details, then the system displays the header and all details.
- AC-US-F03-03-02: Then each detail displays the asset, expected return date, approval status, and rejection reason when present.
- AC-US-F03-03-03: Then the approval status is only `PENDING`, `APPROVED`, or `REJECTED`.
- AC-US-F03-03-04: Given the request does not belong to the user and the user lacks permission to view all requests, then the system rejects the request.

## Applicable Business Rules

`BR-BOR-03`, `BR-BOR-04`.

## Related Functional Requirements

`FR-F03-04`.
