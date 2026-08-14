# US-F02-08 – Look up an asset by QR

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **scan an equipment QR code**,\
so that **I can quickly open the correct asset details page**.

## Acceptance Criteria

- AC-US-F02-08-01: Given a valid QR URL and a user with view permission, when scanning it, then the system opens the corresponding asset details.
- AC-US-F02-08-02: Given the QR does not exist, then the system reports that the asset was not found.
- AC-US-F02-08-03: Scanning a QR does not create an inventory session, record an inventory result, or change the asset status.
- AC-US-F02-08-04: Given the user lacks asset view permission, then the system rejects access to the details.
- AC-US-F02-08-05: The QR is generated once when the asset is created; regeneration is not supported in the MVP.

## Applicable Business Rules

`BR-AST-05`, `BR-AST-09`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F02-09`.
