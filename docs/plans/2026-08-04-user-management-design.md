# User Management implementation design

## Scope

Implement the four approved F08 screens using the existing authenticated AppShell:

- User List (`/users`)
- Add New User (`/users/new`)
- User Details (`/users/:id`)
- Edit User (`/users/:id/edit`)

The UI follows the four supplied English Stitch mockups and the BigIn Ant Design visual foundation. It implements user listing/search/filtering, user creation, details, profile updates, optional password changes, role assignment, and account activation/deactivation.

## Source-of-truth constraints

- Visibility and actions are based on effective permissions, not role names.
- Existing roles may be assigned or removed; roles and permission codes are not created or edited.
- User Details displays only persisted user, department, status, contact, avatar, and assigned-role data.
- The mockup's permission summary and managed/borrowed asset panels are omitted because the current MVP requirements do not define them as User Management data.
- Deactivation preserves the user and related business history.

## API and data

The existing `/api/users` endpoints remain the integration boundary. `avatarUrl` is added to create/update validation and persistence because it already exists in the database and approved requirements. Existing department and role endpoints populate bounded selections.

## UI states

All screens account for loading, empty, validation, forbidden-by-route, recoverable API errors, pending mutations, and success feedback. Destructive deactivation uses explicit confirmation.
