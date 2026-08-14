# US-F06-05 – Update repair progress

## User Story

As an **Asset Manager or Admin**,\
I want to **update the handling information**,\
so that **cost, repair provider, and progress are tracked centrally**.

## Acceptance Criteria

- AC-US-F06-05-01: Given the issue is in an allowed stage, when updating it with valid data, then the system saves the new information.
- AC-US-F06-05-02: The information may include the vendor, start/end dates, cost, result, and notes according to the baseline.
- AC-US-F06-05-03: Given the cost or time is invalid, then the system rejects the request and keeps the old data.
- AC-US-F06-05-04: Given the user lacks permission, then the system does not change the issue.
- AC-US-F06-05-05: Omitting `vendorId` preserves the vendor and does not require `vendor.view`; a number or `null` requires both `asset_issue.update` and `vendor.view`.

## Applicable Business Rules

`BR-ISS-03`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F06-06`.
