# US-F04-04 – Approve all with partial success

## User Story

As an **Asset Manager or Admin**,\
I want to **bulk-approve eligible pending details**,\
so that **requests are processed quickly without assigning the same asset twice**.

## Acceptance Criteria

- AC-US-F04-04-01: Given a request has multiple `PENDING` details, when selecting Approve All, then the system checks and processes each detail.
- AC-US-F04-04-02: A detail whose asset is `AVAILABLE` becomes `APPROVED`, and the asset becomes `RESERVED`.
- AC-US-F04-04-03: A detail whose asset is no longer eligible remains `PENDING` and returns the reason it could not be approved.
- AC-US-F04-04-04: Failure of one detail does not roll back other details that were successfully approved in the bulk action.
- AC-US-F04-04-05: Given at least one detail succeeds and other details remain in another status, then the header is `PARTIALLY_APPROVED`.
- AC-US-F04-04-06: Each successful detail must still satisfy atomicity and double-approval prevention constraints.

## Applicable Business Rules

`BR-BOR-06`, `BR-BOR-10`, `BR-BOR-11`, `BR-BOR-12`, `BR-BOR-15`.

## Related Functional Requirements

`FR-F04-04`, `FR-F04-05`, `FR-F04-06`.
