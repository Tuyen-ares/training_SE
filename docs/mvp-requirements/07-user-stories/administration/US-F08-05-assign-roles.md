# US-F08-05 – Assign or remove existing roles

## User Story

As an **Admin**,\
I want to **assign or remove existing roles for a user**,\
so that **access reflects the user's work responsibilities**.

## Acceptance Criteria

- AC-US-F08-05-01: Given the user has permission, when opening role assignment, then the system displays the available roles.
- AC-US-F08-05-02: Given a valid user and role, when saving, then the user's role set reflects the selection.
- AC-US-F08-05-03: Given a role does not exist, then the system rejects the request and does not save a partial role set.
- AC-US-F08-05-04: Assigning the same role again does not create a duplicate relationship.
- AC-US-F08-05-05: Changing roles does not create a new role or permission code.
- AC-US-F08-05-06: An Admin does not gain business permissions beyond the permissions of the assigned roles.
- AC-US-F08-05-07: The replace-set must retain at least one role and roll back if a role is invalid or would remove the essential Admin invariant.
- AC-US-F08-05-08: New effective permissions are reflected at the next login or refresh.

## Applicable Business Rules

`BR-RBAC-01..07`.

## Related Functional Requirements

`FR-F08-05`, `FR-F08-06`, `FR-F08-07`.
