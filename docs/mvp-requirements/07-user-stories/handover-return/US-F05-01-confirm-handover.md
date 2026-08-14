# US-F05-01 – Confirm handover

## User Story

As an **Asset Manager or Admin**,\
I want to **confirm the handover of a reserved asset**,\
so that **the borrower is recorded as having received the equipment**.

## Acceptance Criteria

- AC-US-F05-01-01: Given the detail is `APPROVED` and the asset is `RESERVED` for that detail, when confirming the handover, then the asset becomes `BORROWED`.
- AC-US-F05-01-02: Then the system creates a borrow history recording the person and handover time.
- AC-US-F05-01-03: Given the detail already has a borrow history, when confirming it again, then the system rejects creating a second history record.
- AC-US-F05-01-04: Given the asset is no longer `RESERVED` for the detail, then no history or status is partially recorded.
- AC-US-F05-01-05: The borrower is identified from the request and does not need to be entered again.

## Applicable Business Rules

`BR-HAN-01`, `BR-HAN-02`, `BR-HAN-03`, `BR-HAN-04`, `BR-HAN-05`, `BR-HAN-06`.

## Related Functional Requirements

`FR-F05-01`, `FR-F05-02`.
