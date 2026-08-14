# US-F02-06 – Manage asset catalogs

## User Story

As an **Asset Manager or Admin**,\
I want to **view, create, and update brands, types, and models**,\
so that **assets are classified consistently**.

## Acceptance Criteria

- AC-US-F02-06-01: Given the user has permission, when viewing the catalogs, then the system displays the existing brands, types, and models.
- AC-US-F02-06-02: Given valid and unique data, when creating a catalog entry, then the system records the new entry.
- AC-US-F02-06-03: Given an existing entry, when updating it with valid data, then the system displays the new value.
- AC-US-F02-06-04: Given data violates a uniqueness constraint, then the system rejects the request.
- AC-US-F02-06-05: The system does not support deleting a brand, type, or model referenced in the MVP.
- AC-US-F02-06-06: An asset type has a server-normalized internal code prefix; an empty or duplicate prefix is rejected, and renaming does not change issued asset codes.

## Applicable Business Rules

`BR-AST-10`, `BR-AST-11`, `BR-AST-12`, `BR-RBAC-01`.

## Related Functional Requirements

`FR-F02-06`.
