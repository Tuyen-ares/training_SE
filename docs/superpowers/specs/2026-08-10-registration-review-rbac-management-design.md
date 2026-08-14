# Registration Review and RBAC Management Design

## Scope

This increment adds a public registration-request workflow and an Administration area for users, registration requests, roles, and role assignment. It supports role list/detail/create, custom-role rename, replace-set permission editing, and replace-set user role assignment. Role deletion and permission CRUD are not included.

Runtime authorization remains permission-based. No workflow may authorize by role name.

## Registration lifecycle

Guest submission creates `registration_requests(PENDING)` only. It stores a bcrypt hash, never a user or session, and does not accept department or role fields. Normalized nullable unique keys enforce at most one pending request per email and phone at database level; terminal requests clear those keys so a rejected applicant can submit again.

Approval locks the request row and performs these actions in one database transaction:

1. verify the request is still pending and its password hash exists;
2. validate department and initial roles, using `employee` when role IDs are omitted;
3. verify email and phone do not already belong to a user;
4. create the active user and allocate its userCode;
5. assign the complete initial role set;
6. set APPROVED, reviewer/review time and `createdUserId`;
7. clear password hash and pending uniqueness keys.

Rejection also locks the row and atomically records reviewer/outcome while clearing password hash and pending keys. Rejection reason is optional. A failed approval rolls back completely and leaves the request pending with its hash available for a later valid review.

## Role and permission management

Roles have `isSystem`; baseline `admin`, `employee`, and `asset_manager` are system roles. System names cannot change, but their permissions can. Every created or updated role has at least one permission. Every user role replacement has at least one role. Replace-set writes are transactional.

Permissions are read-only in the application and include an English description used by the grouped permission picker. Effective permissions are still the union of current role-permission relations. Access tokens carry a snapshot, so changes become effective at the next login or refresh.

## Essential administration invariant

The protected capability set is:

`user.view`, `user.create`, `user.update`, `user.manage_status`, `role.view`, `role.create`, `role.update`, `role.assign`, `permission.view`, `user_registration.review`.

Role-permission replacement, user-role replacement, role changes through user update, and user deactivation lock the same essential permission rows in deterministic order. After the mutation, the transaction must still find at least one active user whose effective permission union contains the entire set. Otherwise the transaction returns conflict and rolls back. The check never uses an admin role name.

## Interface

Authenticated administration uses one sidebar entry and four tabs: Users,
Departments, Registration Requests, and Roles. Tabs and actions are shown by
permission; backend checks remain authoritative. User status uses
`user.manage_status`; information updates use `user.update`. Department status
uses `department.manage_status` and there is no department delete action.

- Registration Queue: status segment, applicant search, oldest pending first, history newest first.
- Registration Detail: applicant identity, review audit, required department, optional multi-role selection with employee default, approve and reject actions.
- Role List: system/custom type, permission count, assigned-user count, create action, no delete action.
- Role Create/Detail: role name, grouped permission checkboxes, code and English description, selected count, protected system-name notice.
- User Detail: current roles and replace-set role dialog requiring at least one role.

All screens include loading, empty, error, permission-gated action, and responsive states.
