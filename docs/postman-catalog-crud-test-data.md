# Dữ liệu Postman cho Department và Asset Catalog CRUD

## 1. Environment

```text
baseUrl      = http://localhost:3000
accessToken  = <được lưu sau khi login>
departmentId = <được lưu sau khi tạo department>
brandId      = <được lưu sau khi tạo brand>
assetTypeId  = <được lưu sau khi tạo asset type>
assetModelId = <được lưu sau khi tạo asset model>
```

Các request CRUD dùng header:

```text
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

User đăng nhập phải có các permission `department.*`, `brand.*`, `asset_type.*`
và `asset_model.*`. Nếu vừa gán permission trong database, phải login lại để access
token mới chứa các permission đó.

## 2. Login và lưu access token

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json
```

```json
{
  "email": "<admin-email>",
  "password": "<admin-password>"
}
```

Postman Tests:

```js
pm.environment.set('accessToken', pm.response.json().data.accessToken);
```

## 3. Department

### Create

```http
POST {{baseUrl}}/api/departments
```

```json
{
  "name": "Postman Test Department"
}
```

```js
pm.environment.set('departmentId', pm.response.json().data.id);
```

### Read

```http
GET {{baseUrl}}/api/departments
GET {{baseUrl}}/api/departments/{{departmentId}}
```

### Update

```http
PATCH {{baseUrl}}/api/departments/{{departmentId}}
```

```json
{
  "name": "Postman Department Updated"
}
```

### Delete

```http
DELETE {{baseUrl}}/api/departments/{{departmentId}}
```

- Không có user tham chiếu: mong đợi `204`.
- Có user mang `department_id={{departmentId}}`: mong đợi `409`.

## 4. Brand

### Create

```http
POST {{baseUrl}}/api/brands
```

```json
{
  "name": "Postman Lenovo"
}
```

```js
pm.environment.set('brandId', pm.response.json().data.id);
```

### Read và Update

```http
GET {{baseUrl}}/api/brands
GET {{baseUrl}}/api/brands/{{brandId}}
PATCH {{baseUrl}}/api/brands/{{brandId}}
```

Body update:

```json
{
  "name": "Postman Lenovo Updated"
}
```

### Delete

```http
DELETE {{baseUrl}}/api/brands/{{brandId}}
```

- Còn Asset Model tham chiếu: mong đợi `409`.
- Không còn Asset Model: mong đợi `204`.

## 5. Asset Type

### Create

```http
POST {{baseUrl}}/api/asset-types
```

```json
{
  "name": "Postman Laptop"
}
```

```js
pm.environment.set('assetTypeId', pm.response.json().data.id);
```

### Read và Update

```http
GET {{baseUrl}}/api/asset-types
GET {{baseUrl}}/api/asset-types/{{assetTypeId}}
PATCH {{baseUrl}}/api/asset-types/{{assetTypeId}}
```

Body update:

```json
{
  "name": "Postman Notebook"
}
```

### Delete

```http
DELETE {{baseUrl}}/api/asset-types/{{assetTypeId}}
```

- Còn Asset Model tham chiếu: mong đợi `409`.
- Không còn Asset Model: mong đợi `204`.

## 6. Asset Model

Phải tạo Brand và Asset Type trước.

### Create

```http
POST {{baseUrl}}/api/asset-models
```

```json
{
  "brand_id": {{brandId}},
  "asset_type_id": {{assetTypeId}},
  "name": "Postman ThinkPad T14"
}
```

```js
pm.environment.set('assetModelId', pm.response.json().data.id);
```

### Read

```http
GET {{baseUrl}}/api/asset-models
GET {{baseUrl}}/api/asset-models/{{assetModelId}}
```

### Update

```http
PATCH {{baseUrl}}/api/asset-models/{{assetModelId}}
```

```json
{
  "name": "Postman ThinkPad T14 Gen 2"
}
```

Có thể cập nhật riêng `brand_id`, `asset_type_id`, `name` hoặc kết hợp các field.

### Delete

```http
DELETE {{baseUrl}}/api/asset-models/{{assetModelId}}
```

- Còn row `assets.asset_model_id={{assetModelId}}`: mong đợi `409`.
- Không còn Asset tham chiếu: mong đợi `204`.

## 7. Thứ tự kiểm tra quan hệ xóa

1. Tạo Brand.
2. Tạo Asset Type.
3. Tạo Asset Model dùng hai ID trên.
4. Xóa Brand: phải nhận `409`.
5. Xóa Asset Type: phải nhận `409`.
6. Nếu muốn kiểm tra guard của Asset Model, tạo một Asset tham chiếu model rồi thử
   xóa model: phải nhận `409`.
7. Xóa Asset tham chiếu hoặc dùng một model chưa có Asset.
8. Xóa Asset Model: `204`.
9. Xóa Brand: `204`.
10. Xóa Asset Type: `204`.

## 8. Các case lỗi nhanh

| Case | Mong đợi |
|---|---|
| Gửi body `{}` khi create/update | `400` |
| Gửi tên dài hơn 30 ký tự | `400` |
| Tạo trùng Brand/Asset Type | `409` |
| Tạo trùng `(brand_id, asset_type_id, name)` | `409` |
| Tạo/update Asset Model bằng Brand hoặc Asset Type không tồn tại | `409` |
| Đọc/update/delete ID không tồn tại | `404` |
| Thiếu access token | `401` |
| Token thiếu permission tương ứng | `403` |
