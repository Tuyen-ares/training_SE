# US-F06-06 – Close a repair

## User Story

As an **Asset Manager or Admin**,\
I want to **record the final repair result**,\
so that **the asset has an operating status appropriate to the result**.

## Acceptance Criteria

- AC-US-F06-06-01: Given the issue and asset are `IN_REPAIR`, when the repair succeeds, then the issue becomes `COMPLETED` and the asset becomes `AVAILABLE`.
- AC-US-F06-06-02: Then the system records the completion time and repair result.
- AC-US-F06-06-03: Given the issue is not `IN_REPAIR`, when closing the repair, then the system rejects the request.
- AC-US-F06-06-04: Given updating the issue or asset fails, then no partial status is saved.
- AC-US-F06-06-05: When the repair fails, the issue becomes `FAILED` and the asset changes from `IN_REPAIR → DAMAGED`; it does not automatically become `RETIRED`.

## Applicable Business Rules

`BR-ISS-03`, `BR-ISS-05`, `BR-ISS-06`, `BR-ISS-07`.

## Related Functional Requirements

`FR-F06-07`, `FR-F06-08`.
