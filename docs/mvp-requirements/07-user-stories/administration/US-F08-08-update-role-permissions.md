# US-F08-08 – Update a role and permission set

## User Story

As an **Admin with `role.update`**, I want to rename a custom role and select or clear permissions so that access reflects current responsibilities.

## Acceptance Criteria

- A custom role can be renamed; system role names are protected.
- Saving permissions replaces the entire set, and the new set must not be empty.
- The mutation rolls back if it would remove the essential Admin invariant.
- A user with the role receives the new effective permissions at the next login/refresh.
- Deleting roles or permission CRUD is not supported.

## Applicable Business Rules

`BR-RBAC-01..07`.

## Related Functional Requirements

`FR-F08-10..12`.
