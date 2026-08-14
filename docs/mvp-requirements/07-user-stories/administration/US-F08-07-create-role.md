# US-F08-07 – Create a role

## User Story

As an **Admin with `role.create`**, I want to create a custom role with an initial permission set so that it represents a new work responsibility.

## Acceptance Criteria

- The name is unique and at most 30 characters.
- The new role is custom and has at least one existing permission.
- The permission selector displays descriptions; it does not create new permission codes.
- The role and permission set are recorded in one transaction.

## Applicable Business Rules

`BR-RBAC-01..05`.

## Related Functional Requirements

`FR-F08-09`, `FR-F08-11`.
