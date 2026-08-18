# User Profile and Password Contract

Self-service profile APIs are for the authenticated user only. They use the
subject from the access token and never accept a target user ID.

## Profile rules

- A user may read their own safe profile through `GET /api/users/me`.
- A user may update only `name`, `phone` and nullable `avatarMediaId` (or legacy `avatarUrl`) through
  `PATCH /api/users/me`.
- Email, department, user code, roles and `isActive` are read-only in this
  contract and remain Admin-managed.
- Email and phone uniqueness rules continue to apply. Invalid input returns
  `400`; duplicate phone returns `409`.
- Successful responses use `{ "data": User }`, and the DTO never includes a
  password or password hash.

## Password rules

`PATCH /api/users/me/password` accepts:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

Both values must be 1–72 characters, and the new password must be at least 6
characters. An incorrect current password returns `400`. A successful change
returns `204`, stores only a bcrypt hash, revokes all refresh-token sessions,
and does not return a token or credential.

## API

| Method | Endpoint | Permission | Contract |
| --- | --- | --- | --- |
| GET | `/api/users/me` | Authenticated user | Return the current user's safe profile. |
| PATCH | `/api/users/me` | Authenticated user | Update `name`, `phone`, and/or `avatarMediaId`; return the safe profile. |
| PATCH | `/api/users/me/password` | Authenticated user | Verify current password, save the new hash, revoke refresh sessions, and return `204`. |

Strict schemas reject unknown fields. The self-service endpoints do not grant
access to any Admin user-management API.

When `avatarMediaId` is present it must be a READY `USER_AVATAR` media uploaded
by the authenticated user. Avatar claim and FK replacement are atomic. The
read resolver prefers the CloudFront URL and falls back to legacy `avatarUrl`.
