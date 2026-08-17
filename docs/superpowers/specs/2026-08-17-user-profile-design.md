# User Profile and Self-Service Password Design

## Scope

Authenticated users can open Profile from the avatar dropdown. Profile is not
an item in the global sidebar. The page shows the current user's safe account
data, allows limited personal-information updates, and provides a separate
password-change workflow.

## Interaction

The avatar dropdown contains `Profile` above `Sign out`. Profile opens the
authenticated `/profile` route. The page has a read-only identity summary, a
personal-information form, and a security form.

Editable profile fields are `name`, `phone`, and nullable `avatarUrl`. Email,
department, user code, roles, and active status remain read-only because they
are managed by administration workflows. Avatar input is URL-based; binary
upload/storage is outside this change.

## API boundary

Self-service APIs use `req.auth.sub` and never accept a target user ID:

- `GET /api/users/me` returns the safe `User` DTO.
- `PATCH /api/users/me` updates only the allowed personal fields and returns
  the safe `User` DTO.
- `PATCH /api/users/me/password` accepts `currentPassword` and `newPassword`,
  stores a bcrypt hash, revokes all refresh-token sessions, and returns `204`.

The existing Admin APIs under `/api/users/:id` are not reused for self-service.
They retain their role, department, status, and Admin permission boundaries.

## State and security

Profile responses never include passwords, password hashes, access tokens, or
refresh tokens. Duplicate phone numbers return `409`; invalid input and an
incorrect current password return `400`. After password change, the frontend
clears the local session and returns the user to Login because all refresh
sessions have been revoked.

## Verification

Backend unit and integration tests cover current-password verification, safe
responses, self-only access, allowed-field updates, and session revocation.
Frontend verification covers the authenticated route, avatar dropdown entry,
responsive rendering, profile save, password validation, and the production
build/static audit.
