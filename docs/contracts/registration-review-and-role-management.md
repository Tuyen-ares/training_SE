# Registration Review and Role Management Contract

## Public registration

`POST /api/registration-requests`

Request: `{ name, email, phone, password }`. Email is normalized to lowercase; phone is exactly 10 digits. Response `201` exposes only `{ id, status, createdAt }`. It never returns a password or hash.

Conflicts: current user email/phone, or another PENDING request with the same normalized email/phone. Pending uniqueness is guaranteed by nullable unique database keys, not only a pre-check.

## Review APIs

All review APIs require `user_registration.review`.

- `GET /api/registration-requests?status=PENDING&q=&page=1&pageSize=20`
- `GET /api/registration-requests/:requestId`
- `POST /api/registration-requests/:requestId/approve` with `{ departmentId, roleIds? }`
- `POST /api/registration-requests/:requestId/reject` with `{ rejectionReason? }`

`roleIds` omitted means default `employee`; an explicit empty array is invalid. Approval and rejection are single-use. Approval creates and links the user and clears the request hash atomically. Rejection reason is optional and rejection clears the hash. Duplicate current-user identity discovered during approval returns `409` and leaves the request PENDING.

List defaults to PENDING, page 20, maximum 100. Pending sorts oldest first; approved/rejected history sorts newest first.

## RBAC APIs

- `GET /api/rbac/roles` — `role.view`, `role.assign`, or `user_registration.review`; returns `{ id, name, isSystem, permissionCount, userCount }[]`.
- `GET /api/rbac/roles/:roleId` — `role.view`; includes permissions.
- `POST /api/rbac/roles` — `role.create`; `{ name, permissionIds }`.
- `PATCH /api/rbac/roles/:roleId` — `role.update`; `{ name }`; system-role rename returns `409`.
- `PUT /api/rbac/roles/:roleId/permissions` — `role.update`; `{ permissionIds }` replace-set.
- `GET /api/rbac/permissions` — `permission.view`; read-only permission descriptions.
- `PUT /api/rbac/users/:userId/roles` — `role.assign`; `{ roleIds }` replace-set.

Role and permission ID arrays are unique and non-empty. There is no role-delete or permission-write API.

Sensitive mutations return `409` when they would leave no active user with every essential administration permission. Authorization always uses effective permission codes. Updated role permissions take effect in newly issued access tokens at login or refresh.
