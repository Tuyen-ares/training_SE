# Media and Image Evidence Contract

This contract defines the Phase 1 media core used by F02, F05, F06 and F08.
All successful API responses use `{ "data": ... }`; errors use the existing
`{ "error": string, "details"?: object }` envelope.

## Storage boundary

- S3 is private with Block Public Access enabled and Bucket owner enforced.
- CloudFront uses a regular S3 origin and Origin Access Control (OAC) with
  signing behavior `always`. The public behavior allows only `GET` and `HEAD`.
- Backend owns presigning, `HeadObject`, `DeleteObject` and URL composition.
  The browser never receives AWS credentials, a presigned GET URL or a
  `DeleteObject` capability.
- Object keys are generated UUID paths and contain no PII:
  `evidence/handover/YYYY/MM/<uuid>.<ext>`,
  `evidence/return/YYYY/MM/<uuid>.<ext>`,
  `evidence/repair/YYYY/MM/<uuid>.<ext>`,
  `asset-images/<uuid>.<ext>` and `user-avatars/<uuid>.<ext>`.
- The object is written with `Cache-Control:
  public,max-age=31536000,immutable`. The backend signs `Content-Type`,
  `Cache-Control` and `If-None-Match: *`; the browser must send those exact
  headers. A second conditional PUT for the same key is rejected (normally
  `412 Precondition Failed`) and never overwrites the old object.
- Backend IAM needs `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` for
  the media prefix and does not need `s3:ListBucket`. The bucket policy grants
  `s3:GetObject` only to the CloudFront service principal through the chosen
  distribution/OAC. S3 CORS explicitly allowlists local origins and the
  Vercel production origin, method `PUT`, and `Content-Type`, `Cache-Control`
  and `If-None-Match`; wildcard origins/headers are not used.

Infrastructure activation is a deployment gate: verify the bucket policy,
CORS preflight, CloudFront `Deployed` state, direct S3 `403`, CloudFront read,
first conditional PUT success, second conditional PUT rejection and old-object
immutability before production rollout. Distribution ID and OAC ID are console
/policy values, not runtime environment variables.

## Data model

`media_files.id` is the public `mediaId`. A row starts as `PENDING` and may only
move to `READY`. It stores `storage_path`, `mime_type`, `size_bytes`, `purpose`,
`upload_status`, `uploaded_by`, `created_at`, nullable `uploaded_at` and
nullable `linked_at`. Purpose values are `HANDOVER`, `RETURN`, `AFTER_REPAIR`,
`ASSET_IMAGE` and `USER_AVATAR`.

Typed relations are separate tables: `handover_evidence` references a borrow
history, `return_evidence` references a borrow history, and `repair_evidence`
references an asset issue. `assets.image_media_id` and `users.avatar_media_id`
are nullable one-to-one FKs. Legacy `image_url` and `avatar_url` remain and are
used only when the new FK is absent. No polymorphic target, `targetId`,
`targetType`, `uploadId` or `originalName` is persisted.

`linked_at` is only a one-time claim marker, not proof of a current reference.
Claim updates and the business mutation/FK or typed relation insert must commit
in one transaction. Cross-purpose validation happens at the business link;
`Complete` only verifies ownership, state and object metadata.

## Permission matrix

| Purpose | Presign permission | Link operation |
| --- | --- | --- |
| `HANDOVER` | `asset.checkout` | Confirm handover |
| `RETURN` | `asset.checkin` | Normal or damaged return |
| `AFTER_REPAIR` | `asset_issue.close` | Successful Complete Repair only |
| `ASSET_IMAGE` | `asset.create` or `asset.update` | Asset create/update |
| `USER_AVATAR` | Authenticated user; admin create/update is constrained again at linking | Self profile or admin user create/update |

Business linking rejects a media with a different purpose. Evidence is optional;
the absence of `mediaIds` preserves all previous behavior. Asset and user each
accept at most one primary image/avatar.

## Presign

`POST /api/media/presign` requires authentication and accepts:

```json
{
  "purpose": "HANDOVER",
  "mimeType": "image/jpeg",
  "sizeBytes": 234567
}
```

The server validates purpose, permission, MIME whitelist and size, creates a
UUID key and `PENDING` row, then returns:

```json
{
  "data": {
    "mediaId": 10,
    "uploadUrl": "https://s3.example/presigned-put",
    "expiresAt": "2026-08-18T10:05:00.000Z",
    "requiredHeaders": {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public,max-age=31536000,immutable",
      "If-None-Match": "*"
    }
  }
}
```

The response never contains `publicUrl`, AWS credentials, target identifiers,
or the original filename. Missing local/test media configuration is a clear
configuration error from the media endpoint; production fails startup before
listening when required media configuration is absent. An AWS outage does not
shut down the backend or non-media business routes.

## Browser upload and complete

The frontend sends the exact required headers in a native `PUT`:

```js
fetch(uploadUrl, { method: 'PUT', headers: requiredHeaders, body: file })
```

After a successful PUT it calls `POST /api/media/:mediaId/complete` with an
empty body. For a `PENDING` row the backend calls `HeadObject` and requires an
exact match for content length, content type and cache control before setting
`READY`, `uploaded_at` and returning the canonical CloudFront URL. A `READY`
complete is idempotent and returns the canonical response without another head.

Metadata mismatch triggers best-effort `DeleteObject`, keeps the row `PENDING`
and returns a media validation error. Head timeout, 5xx, throttling, access
failure, 403 and 404 do not call `DeleteObject`; the row stays `PENDING` and a
complete retry with the same `mediaId` is allowed. A 404 is reported as a
verification/not-found failure, not as permission to delete the row.

## Cancel and retry

`DELETE /api/media/:mediaId` is only for the authenticated uploader while
`linked_at IS NULL`. The backend calls `DeleteObject`; it deletes the DB row
only after a successful delete or a confirmed object-not-found result. A
transient storage error keeps the row and storage path for later cleanup. A
linked media cannot be cancelled. The endpoint follows the existing project
not-found/idempotency convention and never exposes AWS details.

- Failed/expired PUT: best-effort cancel, then presign a new media/key. Never
  reuse the old key when the browser cannot prove no object was created.
- Successful PUT + transient complete failure: retry complete on the same ID;
  do not PUT again to the same key.
- Conditional PUT `412`: do not retry the PUT or blindly delete the existing
  object. The browser leaves the pending row for stale cleanup and presigns a
  new ID/key.
- Metadata mismatch: use a new presign/key after best-effort invalid-upload
  cleanup. This is distinct from user cancel and orphan cleanup.

## Business request shapes

Handover, normal return and damaged return accept optional unique
`mediaIds: number[]` (maximum ten configured evidence images). Successful
Complete Repair accepts the same optional field; Fail Repair rejects it.
Responses retain existing fields and history/issue reads add typed evidence:

```json
{
  "mediaId": 10,
  "mimeType": "image/jpeg",
  "sizeBytes": 234567,
  "uploadedAt": "2026-08-18T10:04:00.000Z",
  "publicUrl": "https://dxxxx.cloudfront.net/evidence/return/2026/08/uuid.jpg"
}
```

Asset create/update accept `imageMediaId`; user admin/self-profile create/update
accept `avatarMediaId`. The read resolver prefers the media URL, then the
legacy URL. No target ID is passed to presign.

## Cleanup and audit

Phase 1 has no worker or Render Cron. Operators run:

```text
media:cleanup --dry-run
media:cleanup --execute
media:audit
```

Candidates are stale `PENDING` older than 15 minutes, unlinked `READY` older
than 24 hours with no typed/FK reference, and `READY` rows with `linked_at` set
but no current typed/FK reference (detached replacement). Execute takes the
storage path from DB, locks and rechecks the row and every evidence/FK relation,
then deletes S3 and the row only when storage is deleted or confirmed missing.
It never lists the bucket. Audit is read-only, heads referenced objects,
reports missing/metadata issues and never repairs or deletes on head failure.
