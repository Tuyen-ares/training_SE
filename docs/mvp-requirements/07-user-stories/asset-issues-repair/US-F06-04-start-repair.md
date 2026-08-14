# US-F06-04 – Start a repair

## User Story

As an **Asset Manager or Admin**,\
I want to **start handling a confirmed issue**,\
so that **I can track the asset while it is being repaired**.

## Acceptance Criteria

- AC-US-F06-04-01: Given the issue is `CONFIRMED` and the asset is `DAMAGED`, when starting the repair, then both the issue and asset become `IN_REPAIR`.
- AC-US-F06-04-02: Then the system records the processor and start date according to the provided information.
- AC-US-F06-04-03: Given the issue or asset is not in the expected source status, then the system rejects the request.
- AC-US-F06-04-04: Given an update fails, then the issue and asset retain their previous statuses.
- AC-US-F06-04-05: Omitting `vendorId` leaves the vendor unchanged; setting or clearing a vendor requires both `asset_issue.create` and `vendor.view`, and only an active vendor may be assigned.

## Applicable Business Rules

`BR-ISS-03`, `BR-ISS-04`.

## Related Functional Requirements

`FR-F06-05`.
