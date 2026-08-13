# Asset Read and Issue Report Contract

This contract covers the Release 1 Asset read slice and the reporting entry of
Asset Issues. All successful responses use the existing API envelope:
`{ "data": ... }`.

## Asset list

`GET /api/assets` requires `asset.view`.

Query parameters:

| Name | Type | Default | Rules |
| --- | --- | --- | --- |
| `q` | string | omitted | Case-insensitive search across immutable asset code, QR code, serial number, and model name. Empty text is ignored. |
| `status` | asset status | omitted | One of `AVAILABLE`, `RESERVED`, `BORROWED`, `DAMAGED`, `IN_REPAIR`, `RETIRED`. |
| `page` | integer | `1` | Must be at least 1. |
| `pageSize` | integer | `20` | Must be between 1 and 100. |

Assets are ordered newest first. The response data is:

```json
{
  "items": [
    {
      "id": 42,
      "assetCode": "LAPTOP0001",
      "serialNumber": "SN-123",
      "qrCode": "a QR UUID",
      "status": "AVAILABLE",
      "model": { "id": 8, "name": "Latitude 7440" }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

`status=AVAILABLE` is the reusable query for the future Borrow Request flow.
It is only a filter in this slice; the API does not create a selection or
borrow request.

## Asset detail

`GET /api/assets/:id` requires `asset.view`. A missing asset returns `404`.

```json
{
  "data": {
    "id": 42,
    "assetCode": "LAPTOP0001",
    "serialNumber": "SN-123",
    "qrCode": "a QR UUID",
    "imageUrl": null,
    "status": "AVAILABLE",
    "model": { "id": 8, "name": "Latitude 7440" },
    "brand": { "id": 2, "name": "Dell" },
    "type": { "id": 3, "name": "Laptop" },
    "department": { "id": 4, "name": "Engineering" },
    "actions": { "canReportIssue": false }
  }
}
```

`assetCode` is immutable and derives from the asset type prefix/sequence; it is
not accepted by Create or Update. `department` may be `null`. `actions.canReportIssue` is true only when the
authenticated user is currently borrowing this asset or has the effective
`asset_issue.report` permission.

## Report an issue

`POST /api/assets/:id/report-damaged` creates an Asset Issue; the legacy path
name is retained for compatibility. It requires authentication, not a static
route permission, because current borrowers are also eligible.

```json
{ "description": "Battery will not charge." }
```

`description` is required after trimming and has a maximum of 1,000
characters. A successful request returns `201` with:

```json
{
  "data": {
    "id": 17,
    "assetId": 42,
    "reportedBy": 9,
    "description": "Battery will not charge.",
    "status": "REPORTED",
    "createdAt": "2026-08-03T00:00:00.000Z"
  }
}
```

The server creates the issue with `REPORTED`, records the authenticated user
and creation time, and never changes the asset status. It returns `400` for an
invalid description, `403` for an authenticated but ineligible reporter, and
`404` for a missing asset.

The effective permission assignment determines who can report issues. Runtime
authorization checks permission codes only; there is no role inheritance or
role-name check. Seed/migration data may assign the capability to existing
roles, but the business logic does not depend on those role names.
