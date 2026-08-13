# Asset Management Write, Catalog, Retire and QR Lookup Contract

Contract này chốt API tối thiểu cho `US-F02-04..08`. Response thành công dùng
envelope `{ "data": ... }`. Backend luôn kiểm tra effective permission; tên role
trong User Story không được dùng để authorize runtime.

## Schema và migration

Schema hiện tại đã đáp ứng scope:

- `assets.department_id` nullable, tham chiếu `departments.id` và `ON DELETE SET NULL`.
- `assets.image_url` nullable, tối đa 500 ký tự.
- `assets.qr_code` bắt buộc, unique, tối đa 36 ký tự.
- `assets.status` mặc định `AVAILABLE` qua enum mapping của Prisma.

Không cần schema migration cho `US-F02-04..08`. Cần data migration idempotent
`20260804150000_grant_asset_manager_department_view` để role `asset_manager` có
thể tải department reference data khi thực hiện Create/Update Asset. Runtime vẫn
kiểm tra permission code; migration này không tạo role inheritance.

## Create Asset — US-F02-04

`POST /api/assets`

Permission: `asset.create`.

Request:

```json
{
  "assetModelId": 12,
  "serialNumber": "SN-2026-001",
  "imageUrl": "https://example.test/assets/laptop.png",
  "departmentId": 3
}
```

- `assetModelId`: positive integer, required, must exist.
- `serialNumber`: trimmed string 1..100 or `null`; non-null value must be unique.
- `imageUrl`: valid URL up to 500 characters or `null`.
- `departmentId`: positive integer or `null`; non-null value must exist.
- `qrCode` and `status` are not accepted. Unknown fields return `400`.
- Server generates a UUID `qr_code`; initial status is always `AVAILABLE`.

Success: `201`.

```json
{
  "data": {
    "id": 42,
    "assetModelId": 12,
    "serialNumber": "SN-2026-001",
    "qrCode": "2dd6ed30-8d5c-4a87-b625-428b5609647f",
    "status": "AVAILABLE",
    "imageUrl": "https://example.test/assets/laptop.png",
    "departmentId": 3,
    "createdAt": "2026-08-04T10:00:00.000Z"
  }
}
```

Errors: `400` invalid DTO; `403` missing permission; `409` duplicate serial or
missing model/department reference.

## Update Asset — US-F02-05

`PATCH /api/assets/:assetId`

Permission: `asset.update`.

Request accepts at least one editable field:

```json
{
  "assetModelId": 13,
  "serialNumber": null,
  "imageUrl": null,
  "departmentId": 4
}
```

Validation is the same as Create. `status`, `qrCode`, `id` and unknown fields are
rejected with `400`. The response is the same Asset mutation DTO as Create.

Errors: `400` invalid DTO/path; `403` missing permission; `404` asset missing;
`409` duplicate serial or missing model/department reference.

## Catalog — US-F02-06

Catalog MVP exposes list, create and update only. Delete routes are not exposed.

### Brand

- `GET /api/brands` — `brand.view`
- `POST /api/brands` — `brand.create`, body `{ "name": "Dell" }`
- `PATCH /api/brands/:brandId` — `brand.update`, body `{ "name": "Dell Inc." }`

DTO: `{ "id": 1, "name": "Dell" }`.

### Asset Type

- `GET /api/asset-types` — `asset_type.view`
- `POST /api/asset-types` — `asset_type.create`, body `{ "name": "Laptop" }`
- `PATCH /api/asset-types/:assetTypeId` — `asset_type.update`

DTO: `{ "id": 2, "name": "Laptop" }`.

### Asset Model

- `GET /api/asset-models` — `asset_model.view`
- `POST /api/asset-models` — `asset_model.create`
- `PATCH /api/asset-models/:assetModelId` — `asset_model.update`

Create/update fields:

```json
{
  "brandId": 1,
  "assetTypeId": 2,
  "name": "Latitude 7440"
}
```

DTO:

```json
{
  "id": 8,
  "brandId": 1,
  "assetTypeId": 2,
  "name": "Latitude 7440"
}
```

Catalog names are trimmed, required and at most 30 characters. Brand/type name
must be unique. Model uniqueness is `(brandId, assetTypeId, name)`. Missing
references and duplicate values return `409`; malformed input returns `400`.

`DELETE /api/brands/:id`, `DELETE /api/asset-types/:id` and
`DELETE /api/asset-models/:id` are not part of the router and therefore return
`404`.

## Retire Asset — US-F02-07

`POST /api/assets/:assetId/retire`

Permission: `asset.delete` from the current permission registry. This code is
used only as the existing authorization capability; the operation is a status
transition, not a database delete.

- Allowed: `AVAILABLE`, `DAMAGED`, `IN_REPAIR` -> `RETIRED`.
- Rejected: `RESERVED`, `BORROWED`, `RETIRED` -> `409`, no data change.
- Success: `204`, empty body.
- Missing asset: `404`; invalid id: `400`; missing permission: `403`.
- `DELETE /api/assets/:assetId` is not exposed.

## QR Lookup — US-F02-08

The QR identifier is immutable after asset creation. The MVP does not expose a
QR regeneration endpoint or `asset.qr_generate` permission. The printed QR
payload is a frontend entry URL in the form
`{VITE_PUBLIC_APP_URL}/qr/{qr_code}`. The `/qr/:qrCode` path is a frontend-only
authenticated entry point and never exposes asset data to guests.

`GET /api/assets/by-qr/:qrCode`

In local Vite development, QR generation and parsing use the browser's current
origin, so the flow works on `localhost:5173`, `localhost:5174`, or another
Vite port without changing the QR helper. In production, the frontend must
define `VITE_PUBLIC_APP_URL` with the deployed frontend origin (for example
`https://training-se-frontend.vercel.app`). Production never falls back to
localhost when this variable is missing or invalid.

Permission: `asset.view`.

The dedicated scanner decodes the frontend QR URL and extracts `qrCode`. Asset
List only links to the dedicated scanner; it does not accept pasted QR values.
The client trims and URL-encodes the extracted identifier, calls this endpoint
and opens `/assets/:id` from the returned `id`.

Success: `200` with the same Asset Detail DTO documented in
`asset-read-and-report-issue.md`. Missing QR returns `404`; blank/invalid path
input returns `400`; missing permission returns `403`.

Lookup is read-only: it creates no inventory/stocktake record and never changes
asset status. The dedicated Asset QR Scan screen can decode the frontend URL
from a camera or from an uploaded image, then reuses this endpoint. Image
decoding happens in the browser; the image is not uploaded or persisted. Asset
List only links to the scanner and does not own the camera or image lifecycle.

## Evidence plan

- `US-F02-04`: API/DB test for generated QR, forced `AVAILABLE`, nullable fields,
  duplicate serial, invalid model/department and forbidden access.
- `US-F02-05`: API/DB test for editable fields, null clearing, rejected
  `status`/`qrCode`, duplicate serial, invalid reference, missing asset and forbidden.
- `US-F02-06`: API/DB tests for list/create/update, duplicate and invalid model
  references; assert DELETE routes are unavailable.
- `US-F02-07`: unit and API/DB tests for every allowed and rejected source state,
  persistence result, not-found and forbidden.
- `US-F02-08`: API/DB tests for found/not-found/forbidden and assertion that lookup
  leaves status unchanged; frontend manual checks for camera and image upload ->
  QR entry -> detail navigation, including the unauthenticated redirect-back flow.
