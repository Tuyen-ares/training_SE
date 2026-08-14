# US-F05-03 – Confirm return

## User Story

As an **Asset Manager or Admin**,\
I want to **confirm an asset's return**,\
so that **the borrowing period ends and the equipment becomes available again**.

## Acceptance Criteria

- AC-US-F05-03-01: Given a `BORROWED` asset has unreturned history, when confirming a normal return, then the system records the recipient, time, and return condition.
- AC-US-F05-03-02: Then the asset changes from `BORROWED → AVAILABLE`.
- AC-US-F05-03-03: Given the history already has a return date, when confirming the return again, then the system rejects the request.
- AC-US-F05-03-04: Given an error occurs in any update, then the history and asset are not saved in a partial state.
- AC-US-F05-03-05: When every approved/handed-over item in the request has been returned, then the header becomes `COMPLETED`.
- AC-US-F05-03-06: Given the recipient confirms the condition as `DAMAGED`, when returning the asset, then the history records `return_date` and `return_condition = DAMAGED`, an issue with status `CONFIRMED` is created, and the asset changes from `BORROWED → DAMAGED`.

## Applicable Business Rules

`BR-RET-01`, `BR-RET-02`, `BR-RET-03`, `BR-BOR-18`, `BR-ISS-08`.

## Related Functional Requirements

`FR-F05-04`, `FR-F04-05`.

## Notes / Out of Scope

When an asset is damaged at return, an issue with status `CONFIRMED` is created; the asset does not remain `BORROWED` after the return is recorded.
