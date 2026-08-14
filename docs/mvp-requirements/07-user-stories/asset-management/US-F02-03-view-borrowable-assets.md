# US-F02-03 – View borrowable assets

## User Story

As an **Employee**,\
I want to **view assets currently eligible for borrowing**,\
so that **I can choose suitable equipment for my request**.

## Acceptance Criteria

- AC-US-F02-03-01: When opening the borrowable list, then only assets with status `AVAILABLE` are displayed.
- AC-US-F02-03-02: Then assets with status `RESERVED`, `BORROWED`, `DAMAGED`, `IN_REPAIR`, or `RETIRED` cannot be selected.
- AC-US-F02-03-03: Given multiple other requests are `PENDING` for an asset that remains `AVAILABLE`, then that asset can still be selected.
- AC-US-F02-03-04: Employees can view borrowable assets across the company; the department only identifies the managing unit.

## Applicable Business Rules

`BR-AST-01`, `BR-AST-02`, `BR-AST-08`, `BR-BOR-05`.

## Related Functional Requirements

`FR-F02-03`.
