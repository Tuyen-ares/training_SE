# Mẫu ngắn: Backend API → Frontend Axios → Giao diện

Ví dụ này minh họa cách một màn hình lấy danh sách asset từ backend rồi hiển thị lên Vue.

## 1. Flow tổng quát

```text
User mở màn hình
→ Vue gọi hàm loadAssets()
→ Axios gọi GET /api/assets
→ Express route xử lý request
→ Backend trả JSON
→ Frontend lấy response.data.data.items
→ gán vào ref assets
→ template render bằng v-for
```

## 2. Backend API mẫu

Trong project thật, route/controller/service/repository nên tách riêng. Để dễ hiểu,
ví dụ này viết ngắn trong một file:

```ts
import express from 'express'

const app = express()

app.get('/api/assets', (_req, res) => {
  const assets = [
    {
      id: 1,
      name: 'MacBook Pro 14"',
      serialNumber: 'MBP-001',
      status: 'AVAILABLE',
    },
    {
      id: 2,
      name: 'Dell Monitor P2422H',
      serialNumber: 'MON-002',
      status: 'BORROWED',
    },
  ]

  // Response envelope của project là { data: ... }
  res.json({
    data: {
      items: assets,
      page: 1,
      pageSize: 20,
      total: assets.length,
    },
  })
})

app.listen(3000)
```

Frontend không nhận trực tiếp mảng asset. Nó nhận:

```json
{
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 2
  }
}
```

## 3. Frontend service dùng Axios

```js
// services/asset.service.js
import axios from 'axios'

const http = axios.create({
  baseURL: 'http://localhost:3000/api',
})

export async function getAssets() {
  const response = await http.get('/assets')

  // Axios response: response.data
  // API envelope: response.data.data
  // Danh sách: response.data.data.items
  return response.data.data
}
```

## 4. Vue view lấy dữ liệu và đẩy lên giao diện

```vue
<script setup>
import { onMounted, ref } from 'vue'
import { getAssets } from '../../services/asset.service'

const assets = ref([])
const loading = ref(false)
const errorMessage = ref('')

async function loadAssets() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getAssets()
    assets.value = result.items
  } catch (error) {
    errorMessage.value = error.message || 'Không thể tải danh sách asset.'
  } finally {
    loading.value = false
  }
}

onMounted(loadAssets)
</script>

<template>
  <section>
    <p v-if="loading">Đang tải...</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>
    <p v-else-if="!assets.length">Chưa có asset.</p>

    <table v-else>
      <thead>
        <tr>
          <th>Tên asset</th>
          <th>Serial number</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="asset in assets" :key="asset.id">
          <td>{{ asset.name }}</td>
          <td>{{ asset.serialNumber }}</td>
          <td>{{ asset.status }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
```

## 5. Cách project BigIn đang dùng

Project đã có Axios wrapper trong `stores/auth.js`, nên feature service thường
không tự tạo Axios instance:

```js
// services/asset.service.js
export const listAssets = (api, params) =>
  api(`/assets?page=${params.page}&pageSize=${params.pageSize}`)
```

View gọi:

```js
const result = await listAssets(authStore.api, {
  page: 1,
  pageSize: 20,
})

assets.value = result.items
```

`authStore.api()` đã làm sẵn các việc:

- gửi Axios request;
- thêm access token;
- gửi refresh-token cookie;
- bóc `{ data: ... }`;
- refresh token nếu gặp `401`;
- gọi lại request ban đầu.

Vì vậy code màn hình chỉ tập trung vào `loading`, `error`, `items` và render.

## 6. Khi debug một màn hình không có dữ liệu

Kiểm tra theo thứ tự:

1. `loadAssets()` có được gọi không?
2. Network có request `GET /api/assets` không?
3. Status response là `200`, `401`, `403` hay `500`?
4. Response có đúng cấu trúc `{ data: { items: [] } }` không?
5. Frontend có lấy đúng `result.items` không?
6. Template có dùng đúng tên field như `serialNumber` và `status` không?

Sai thường gặp:

```js
assets.value = response.data // Sai: đây vẫn là API envelope
assets.value = response.data.data // Sai nếu cần danh sách items
assets.value = response.data.data.items // Đúng với Axios thuần
```

Trong BigIn, `authStore.api()` đã unwrap một lớp `data`, nên thường chỉ cần:

```js
assets.value = result.items
```
