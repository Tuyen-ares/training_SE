# Department Management Contract

Departments are organizational reference data for users and assets. A
department has `id`, `name` and boolean `isActive`. It is never hard-deleted
through the application API.

## Lifecycle rules

- New departments are active.
- `PATCH /api/departments/:id` updates `name` only and requires
  `department.update`. Sending `isActive` returns `400`.
- `PATCH /api/departments/:id/status` changes `isActive` in either direction
  and requires `department.manage_status`.
- An inactive department remains visible to authorized administration users and
  retains existing user, asset and history links.
- An inactive department cannot be selected for a new user assignment,
  registration approval or asset assignment. Existing links are not removed.
  An update may retain the current inactive department on an existing user or
  asset while changing other information; moving a record into an inactive
  department is rejected.
- There is no department DELETE route and `department.delete` is not a runtime
  permission.

## API

Successful responses use `{ "data": ... }`.

| Method | Endpoint | Permission | Contract |
| --- | --- | --- | --- |
| GET | `/api/departments` | `department.view` or `user_registration.review` | List active and inactive departments. |
| GET | `/api/departments/:id` | `department.view` | Return one department or `404`. |
| POST | `/api/departments` | `department.create` | Create an active department; duplicate name returns `409`. |
| PATCH | `/api/departments/:id` | `department.update` | Update `name` only; duplicate name returns `409`. |
| PATCH | `/api/departments/:id/status` | `department.manage_status` | Body `{ "isActive": boolean }`; return the updated department or `404`. |

Invalid or strict-schema input returns `400`; missing permission returns `403`.

The backend rejects inactive departments when creating or updating a user's
department, approving a registration request, or creating/updating an asset.
