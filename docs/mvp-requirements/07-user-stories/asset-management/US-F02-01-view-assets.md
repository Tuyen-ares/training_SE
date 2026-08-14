# US-F02-01 – View the asset list

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **view and filter the asset list**,\
so that **I can find equipment to monitor or process**.

## Acceptance Criteria

- AC-US-F02-01-01: Given the user has permission, when opening the list, then the system displays assets within the permitted scope.
- AC-US-F02-01-02: Then each row shows at least the immutable asset code, model, and current status; search supports the asset code.
- AC-US-F02-01-03: When applying a supported filter, then the results contain only matching assets.
- AC-US-F02-01-04: Given the user lacks view permission, when accessing the list, then the system rejects the request.

## Applicable Business Rules

`BR-AST-08`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F02-01`, `FR-F02-07`.
