# US-F02-04 – Create an asset

## User Story

As an **Asset Manager or Admin**,\
I want to **create an asset with valid identification information**,\
so that **new equipment is added to the managed inventory**.

## Acceptance Criteria

- AC-US-F02-04-01: Given a valid model and all required data, when creating the asset, then the system records it with a server-issued immutable asset code and status `AVAILABLE`.
- AC-US-F02-04-02: image_url is optional; when provided, it is stored as the asset image URL.
- AC-US-F02-04-03: Given the QR already exists, when creating the asset, then the system rejects the request.
- AC-US-F02-04-04: Given the serial value already exists, when creating the asset, then the system rejects the request.
- AC-US-F02-04-05: Given the department does not exist, when creating the asset, then the system rejects the request.
- AC-US-F02-04-06: Given the user lacks permission, then the asset is not created.

## Applicable Business Rules

`BR-AST-01`, `BR-AST-05`, `BR-AST-06`, `BR-AST-11`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F02-04`.
