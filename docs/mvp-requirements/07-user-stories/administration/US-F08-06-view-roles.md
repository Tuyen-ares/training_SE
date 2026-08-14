# US-F08-06 – View roles

## User Story

As an **Admin with `role.view`**, I want to view the role list and details so that I understand which permissions each role uses and how many users are assigned to it.

## Acceptance Criteria

- The list returns the name, system/custom classification, permission count, and user count.
- The details return the permission set with codes and English descriptions.
- The UI does not display a delete action.
- Authorization checks the permission, not the role name.

## Applicable Business Rules

`BR-RBAC-01..07`.

## Related Functional Requirements

`FR-F08-08`, `FR-F08-11`.
