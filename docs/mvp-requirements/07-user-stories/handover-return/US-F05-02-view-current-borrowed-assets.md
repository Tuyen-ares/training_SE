# US-F05-02 – View currently borrowed assets

## User Story

As an **Employee**,\
I want to **view the assets currently handed over to me**,\
so that **I know my current return responsibilities**.

## Acceptance Criteria

- AC-US-F05-02-01: When opening the borrowed-assets list, then the system displays only unreturned history belonging to requests from the current user.
- AC-US-F05-02-01a: Matching assets from the same borrow request are rendered once in one request row of the shared titled table; the row expands to an asset table and pagination counts request groups.
- AC-US-F05-02-02: Then each row displays the asset, handover date, and expected return date.
- AC-US-F05-02-03: A detail that is only `APPROVED` but has not been handed over is not considered borrowed.
- AC-US-F05-02-04: An asset with a return date no longer appears in the borrowed-assets list.

## Applicable Business Rules

`BR-HAN-03`, `BR-HAN-06`.

## Related Functional Requirements

`FR-F05-03`.
