# Vendor Management and Repair Provider Contract

Vendor is shared master data. The current consumer is Asset Issues & Repair;
future acquisition, warranty or other asset workflows may reuse the same table.
This contract does not add vendor types, supplier records, tax, pricing,
invoice, warranty or immutable name snapshots.

## Vendor schema and lifecycle

`vendors` contains `id`, unique `name`, nullable `contactName`, `phone`,
`email`, `address`, boolean `isActive`, `createdAt` and `updatedAt`.
Optional contact strings are trimmed; blank strings are persisted as `null`.
New vendors are active.

An inactive vendor is hidden from the default repair selector and cannot be
assigned to a new repair. It remains visible in Vendor Management and remains
valid for existing issue history. `PATCH /api/vendors/:id` changes
`isActive`; no separate activate/deactivate permission or endpoint exists.

Vendor records are never deleted through the MVP API. Deactivation is the
only supported way to stop using a vendor and preserves the record/history;
the database FK remains `ON DELETE RESTRICT` as a safety boundary for any
out-of-band maintenance.

## Vendor API

All successful responses use `{ "data": ... }`.

- `GET /api/vendors?q=&page=1&pageSize=20&isActive=true|false` requires
  `vendor.view`. Omitting `isActive` returns All; search matches vendor name.
- `GET /api/vendors/:id` requires `vendor.view` and returns contact data.
- `POST /api/vendors` requires `vendor.create` and accepts `name` plus optional
  contact fields. It always creates `isActive=true`.
- `PATCH /api/vendors/:id` requires `vendor.update` and accepts any non-empty
  subset of name/contact fields plus `isActive`.
There is no vendor delete endpoint or `vendor.delete` permission in the MVP.

Duplicate names follow the database collation and return `409`. Invalid input
returns `400`; missing permission returns `403`.

## Asset Issue relationship

`asset_issues.vendor_id` is nullable and references `vendors.id` with
`ON DELETE RESTRICT`. The issue response contains only:

```json
{ "vendor": { "id": 12, "name": "ABC Computer" } }
```

or `vendor: null`. Any user with `asset_issue.view` may see this name. Vendor
contacts are only returned by Vendor API with `vendor.view`. Renaming a vendor
changes the name shown for historical issues; no `vendor_name_snapshot` exists
in this phase.

## Repair mutation semantics

`POST /start-repair`, `PATCH /repair`, `POST /complete`, and `POST /fail` use
strict schemas. `repairProvider` is rejected with `400`.

| `vendorId` in request | Meaning | Required permissions |
| --- | --- | --- |
| Omitted | Preserve the current vendor; no vendor authorization is needed. | Existing endpoint repair permission only (`asset_issue.create`, `asset_issue.update`, or `asset_issue.close`). |
| Number | Assign/change to an existing active vendor. | Existing endpoint repair permission **and** `vendor.view`. |
| `null` | Clear the current vendor. | Existing endpoint repair permission **and** `vendor.view`. |

The service distinguishes omitted from `null`. A nonexistent vendor or an
inactive vendor selected for a new repair returns `409`. If an issue already
references an inactive vendor, updating other repair fields while omitting
`vendorId` remains allowed.

## Locking and concurrency

Assigning/clearing and vendor status updates use the same database transaction
and lock the target vendor row with `SELECT ... FOR UPDATE` before checking or
changing it. Deactivation therefore serializes with assignment:

- if assignment locks first, it may assign while the vendor is active; a later
  deactivation commits and the historical reference remains valid;
- if deactivation locks first, an assignment waiting on the row observes
  inactive state and returns `409`;
- clearing locks the current vendor when one exists, then clears the FK.

Vendor rows are never deleted by the application; deactivate/update locks the
vendor row and keeps all historical references intact.

## Legacy migration

Migration is expand/contract:

1. Expand creates `vendors` and nullable `asset_issues.vendor_id`, trims legacy
   `repair_provider`, ignores blank values, deduplicates by DB collation,
   creates active vendors and maps every nonblank issue value.
2. A preflight guard aborts before FK/contract work if any nonblank value is
   unmapped. Temporary staging/guard tables have primary keys because runtime
   uses `sql_require_primary_key`.
3. New code reads/writes only `vendor_id`; legacy column is retained during
   the compatibility deployment window.
4. Contract re-checks mapping and drops `repair_provider` only after all old
   application instances are drained. A failed preflight happens before the
   destructive DDL, so legacy values remain recoverable.

The one-time `vendor.view` compatibility grant is selected from actual
`role_permissions` rows for the permissions guarding the current repair
provider mutations. It is a migration/seed action only; runtime has no
`asset_issue.* => vendor.view` inheritance. Default system role grants are
initial configuration and may later be changed independently by Admin.
