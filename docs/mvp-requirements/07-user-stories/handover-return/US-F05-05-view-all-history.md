# US-F05-05 – View all borrowing history

## User Story

As an **Asset Manager or Admin**,\
I want to **search borrowing and return history within my permitted scope**,\
so that **I can manage and reconcile assets**.

## Acceptance Criteria

- AC-US-F05-05-01: Given the user has permission, when opening the history, then the system displays records within the permitted scope.
- AC-US-F05-05-01a: Company-wide current and returned records use a shared titled table grouped by borrow request, with matching asset histories nested in an expandable child table and pagination counting requests.
- AC-US-F05-05-02: Then the borrower can be identified through the request, handover person, and return recipient.
- AC-US-F05-05-03: Given the user lacks permission to view all history, then the user cannot access other users' history.
- AC-US-F05-05-04: The displayed data reflects recorded history and does not infer a handover from approval status alone.
- AC-US-F05-05-05: When opening a history detail, a user with permission to view all history sees the stored borrowing reason, approval metadata, handover metadata, and return metadata.
- AC-US-F05-05-06: Where evidence exists, permitted history detail reads the stored typed evidence and does not infer evidence from legacy URLs.

## Applicable Business Rules

`BR-HAN-03`, `BR-HAN-05`, `BR-HAN-06`, `BR-RET-01`.

## Related Functional Requirements

`FR-F05-05`.
