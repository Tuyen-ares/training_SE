# US-F02-05 – Update an asset

## User Story

As an **Asset Manager or Admin**,\
I want to **update the asset information and managing department**,\
so that **the data accurately reflects the current management state**.

## Acceptance Criteria

- AC-US-F02-05-01: Given a valid asset and valid reference data, when updating, then the system saves and displays the new information, including image_url when provided.
- AC-US-F02-05-02: Given the new serial matches another asset, when updating, then the system rejects the request.
- AC-US-F02-05-03: Given the department or model does not exist, when updating, then the system rejects the request.
- AC-US-F02-05-04: A business status change must not be performed as an ordinary information update.
- AC-US-F02-05-05: Given the user lacks permission, then the data does not change.
- AC-US-F02-05-06: The asset code is displayed as read-only and cannot be changed through the API or update form.

## Applicable Business Rules

`BR-AST-01`, `BR-AST-06`, `BR-AST-11`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F02-05`.
