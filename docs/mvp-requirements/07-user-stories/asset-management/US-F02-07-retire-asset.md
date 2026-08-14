# US-F02-07 – Retire an asset

## User Story

As an **Asset Manager or Admin**,\
I want to **retire assets that are no longer suitable**,\
so that **they cannot continue participating in operational workflows**.

## Acceptance Criteria

- AC-US-F02-07-01: Given the user has the appropriate permission and the asset is `AVAILABLE`, `DAMAGED`, or `IN_REPAIR`, when a valid retirement is requested, then the asset becomes `RETIRED`.
- AC-US-F02-07-02: Given an asset is `RETIRED`, then it does not appear in the borrowable list.
- AC-US-F02-07-03: Given an asset is `RETIRED`, when a new business transition is requested, then the system rejects it.
- AC-US-F02-07-04: Given an asset is `RESERVED` or `BORROWED`, when retirement is requested, then the system rejects it.

## Applicable Business Rules

`BR-AST-07`, `BR-ISS-06`.

## Related Functional Requirements

`FR-F02-08`.
