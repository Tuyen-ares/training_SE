# US-F02-02 – View asset details

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **view an asset's details**,\
so that **I know its exact identity, classification, department, and status**.

## Acceptance Criteria

- AC-US-F02-02-01: Given the asset exists and the user has permission, when opening the details, then the system displays the asset information.
- AC-US-F02-02-02: Then the information includes the read-only asset code, model, brand, type, serial, QR, department, and current status when available.
- AC-US-F02-02-03: Given the asset does not exist, when requesting its details, then the system reports that it was not found.
- AC-US-F02-02-04: Given the user lacks permission, then the system does not disclose the asset details.

## Applicable Business Rules

`BR-AST-01`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F02-02`.
