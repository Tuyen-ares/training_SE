# US-F01-04 – Access by permission

## User Story

As an **Employee, Asset Manager, or Admin**,\
I want to **use only the actions I have permission to perform**,\
so that **data and business operations are protected according to responsibility**.

## Acceptance Criteria

- AC-US-F01-04-01: Given the user has the required permission, when performing the action, then the system allows it to continue if the other business conditions are valid.
- AC-US-F01-04-02: Given the user lacks the permission, when performing the action, then the system rejects it and does not change data.
- AC-US-F01-04-03: Given an Admin lacks a Manager business permission, when performing that business operation, then the system still rejects it.
- AC-US-F01-04-04: Given a user has multiple roles, then the effective permissions are the union of the permissions directly assigned through those roles.

## Applicable Business Rules

`BR-RBAC-01`, `BR-RBAC-02`, `BR-RBAC-03`.

## Related Functional Requirements

`FR-F01-05`.
