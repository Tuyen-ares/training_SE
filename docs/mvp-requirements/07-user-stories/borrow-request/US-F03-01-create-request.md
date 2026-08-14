# US-F03-01 – Create a borrowing request

## User Story

As an **Employee**,\
I want to **create a request for one or more assets**,\
so that **I can request equipment for my work**.

## Acceptance Criteria

- AC-US-F03-01-01: Given at least one `AVAILABLE` asset is selected and the expected return date is valid, when submitting the request, then the system creates a request with `PENDING` details.
- AC-US-F03-01-02: Then the asset remains `AVAILABLE` until a detail is approved.
- AC-US-F03-01-03: Given the same asset appears more than once in the request, then the system rejects it.
- AC-US-F03-01-04: Given an asset does not exist or is no longer `AVAILABLE` at submission time, then the system rejects the detail/request according to the displayed validation and does not create invalid data.
- AC-US-F03-01-05: Given multiple employees create `PENDING` requests for an `AVAILABLE` asset, then all requests can be recorded.
- AC-US-F03-01-06: Given Borrowing Purpose is missing or contains only whitespace, when submitting the request, then the system rejects it with validation and does not create a request.

## Applicable Business Rules

`BR-BOR-01`, `BR-BOR-02`, `BR-BOR-04`, `BR-BOR-05`, `BR-AST-02`.

## Related Functional Requirements

`FR-F03-01`, `FR-F03-02`.
