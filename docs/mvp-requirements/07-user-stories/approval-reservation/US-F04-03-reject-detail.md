# US-F04-03 – Reject a detail

## User Story

As an **Asset Manager or Admin**,\
I want to **reject a pending asset and record a reason**,\
so that **the requester understands the processing decision**.

## Acceptance Criteria

- AC-US-F04-03-01: Given the detail is `PENDING`, when rejecting it with a valid reason, then the detail becomes `REJECTED`.
- AC-US-F04-03-02: Then the system records the person, time, and rejection reason.
- AC-US-F04-03-03: Given the reason is missing, when rejecting new data, then the system does not complete the operation.
- AC-US-F04-03-04: Given the detail is no longer `PENDING`, then the system rejects reprocessing it.
- AC-US-F04-03-05: Then rejecting an unapproved detail does not change the asset status.

## Applicable Business Rules

`BR-BOR-03`, `BR-BOR-04`, `BR-BOR-13`, `BR-BOR-14`, `BR-BOR-15`.

## Related Functional Requirements

`FR-F04-03`, `FR-F04-05`.
