# US-F03-04 – Withdraw a request

## User Story

As an **Employee**,\
I want to **withdraw a request for which no asset has been handed over**,\
so that **I can cancel a borrowing need that is no longer necessary**.

## Acceptance Criteria

- AC-US-F03-04-01: Given the request belongs to the user and no asset is `BORROWED`, when withdrawing it, then the header becomes `CANCELLED`.
- AC-US-F03-04-02: Then every asset `RESERVED` by the request becomes `AVAILABLE`.
- AC-US-F03-04-03: Then the detail statuses remain unchanged to preserve the processing history.
- AC-US-F03-04-04: Given at least one asset is `BORROWED`, when withdrawing the request, then the system rejects it and does not change data.
- AC-US-F03-04-05: Given the request does not belong to the user, then the user cannot withdraw it with employee permissions.

## Applicable Business Rules

`BR-BOR-09`, `BR-BOR-16`, `BR-BOR-17`, `BR-RET-04`.

## Related Functional Requirements

`FR-F03-05`, `FR-F04-05`.
