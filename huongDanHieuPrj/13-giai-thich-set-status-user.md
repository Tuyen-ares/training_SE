# 13. Giải thích `setStatus`: vì sao có hai `if (!isActive)`?

Tài liệu này dành cho người mới đọc code backend. Mục tiêu là hiểu dữ liệu đi
từ request vào service như thế nào, và vì sao hai khối `if (!isActive)` không
bị trùng nhau.

Code liên quan:

- [user.controller.ts](../apps/backend/src/controllers/user.controller.ts)
- [user.service.ts](../apps/backend/src/services/user.service.ts)
- [user.prisma.repository.ts](../apps/backend/src/repositories/user.prisma.repository.ts)

---

## 1. Bài toán nghiệp vụ

Hệ thống dùng một endpoint cho cả kích hoạt và vô hiệu hóa user:

```text
PATCH /api/users/:id/status
```

Body gửi lên:

```json
{ "isActive": true }
```

hoặc:

```json
{ "isActive": false }
```

Ý nghĩa:

| `isActive` | Hành động |
|---|---|
| `true` | Kích hoạt user |
| `false` | Vô hiệu hóa user |

User không bị xóa khỏi database. Hệ thống chỉ đổi cột `users.is_active`, còn
lịch sử nghiệp vụ và dữ liệu liên quan vẫn được giữ lại.

---

## 2. `isActive` nhận giá trị từ đâu?

Trong controller, request body được kiểm tra bằng Zod:

```ts
const updateStatusSchema = z.strictObject({
  isActive: z.boolean(),
});
```

`z.boolean()` yêu cầu giá trị phải là boolean thật:

```json
{ "isActive": true }
```

```json
{ "isActive": false }
```

Body sau không hợp lệ vì `"false"` là chuỗi, không phải boolean:

```json
{ "isActive": "false" }
```

Sau khi parse thành công, controller gọi service:

```ts
const user = await this.service.setStatus(
  id,
  parsed.data.isActive,
);
```

Ví dụ request thật:

```http
PATCH /api/users/10/status
```

```json
{ "isActive": false }
```

thì lời gọi thực tế là:

```ts
this.service.setStatus(10, false);
```

Trong service lúc này:

```ts
id = 10;
isActive = false;
```

`isActive` không tự được gán bên trong service. Nó nhận giá trị do controller
truyền vào.

---

## 3. Boolean và dấu `!`

Boolean chỉ có hai giá trị:

```ts
true
false
```

Dấu `!` nghĩa là lấy giá trị ngược lại:

```ts
!true  // false
!false // true
```

Vì vậy:

```ts
if (!isActive) {
  // code
}
```

tương đương với:

```ts
if (isActive === false) {
  // code
}
```

`!isActive` không thay đổi biến `isActive`. Nó chỉ tạo ra kết quả ngược lại
để dùng trong điều kiện `if`:

```ts
const isActive = false;

console.log(isActive);  // false
console.log(!isActive); // true
console.log(isActive);  // false, biến gốc không đổi
```

---

## 4. Đoạn code đầy đủ

```ts
async setStatus(id: number, isActive: boolean): Promise<UserResponseDto | null> {
  if (!(await this.repository.findById(id))) return null;

  return this.prisma.$transaction(async (transaction) => {
    if (!isActive) {
      await this.rbacService.lockEssentialAdminGuard(transaction);
    }
    const updated = await this.repository.setActive(id, isActive, transaction);
    if (!updated) return null;

    if (!isActive) {
      await this.sessionService.revokeAllForUser(id, transaction);
      await this.rbacService.assertEssentialAdminExists(transaction);
    }

    return this.repository.findById(id, transaction);
  });
}
```

Các biến chính:

| Biến | Ý nghĩa |
|---|---|
| `id` | ID user cần đổi trạng thái |
| `isActive` | Trạng thái mới muốn ghi vào database |
| `transaction` | Kết nối database nằm trong transaction |
| `updated` | Cho biết thao tác cập nhật có tìm thấy user hay không |
| `null` | Không tìm thấy user hoặc không cập nhật được |

---

## 5. Vì sao có hai `if (!isActive)`?

Hai điều kiện cùng kiểm tra một việc: có đang vô hiệu hóa user hay không. Nhưng
chúng đứng ở hai thời điểm khác nhau và làm hai nhóm việc khác nhau:

```text
if (!isActive) lần 1
→ bảo vệ trước khi đổi dữ liệu

setActive(...)
→ đổi trạng thái user

if (!isActive) lần 2
→ xử lý hậu quả sau khi đổi dữ liệu
```

### Khối thứ nhất: bảo vệ trước khi cập nhật

```ts
if (!isActive) {
  await this.rbacService.lockEssentialAdminGuard(transaction);
}
```

Khối này chạy trước `setActive`.

Nó khóa các permission quản trị thiết yếu bằng `FOR UPDATE`, giúp các request
RBAC đồng thời không cùng làm mất admin cuối cùng. Đây là bước chuẩn bị và bảo
vệ dữ liệu trước khi thay đổi.

### Khối thứ hai: xử lý sau khi cập nhật

```ts
if (!isActive) {
  await this.sessionService.revokeAllForUser(id, transaction);
  await this.rbacService.assertEssentialAdminExists(transaction);
}
```

Khối này chạy sau `setActive` và làm hai việc:

1. Thu hồi toàn bộ refresh token của user vừa bị vô hiệu hóa.
2. Kiểm tra sau thay đổi rằng vẫn còn ít nhất một user active có đủ permission
   quản trị thiết yếu.

Không thể đặt cả hai nhóm việc vào một vị trí duy nhất:

- Khóa bảo vệ cần chạy **trước** cập nhật để chống cạnh tranh giữa các request.
- Thu hồi session và kiểm tra kết quả cần chạy **sau** cập nhật vì phải xử lý
  trạng thái mới.

---

## 6. Trace case 1: `isActive = true`

### Dữ liệu đầu vào

Request:

```http
PATCH /api/users/10/status
```

```json
{ "isActive": true }
```

Database trước khi chạy:

```json
{
  "id": 10,
  "is_active": false
}
```

### Bước 1: controller gọi service

Sau khi Zod parse:

```ts
parsed.data.isActive === true;
```

Controller gọi:

```ts
this.service.setStatus(10, true);
```

Service nhận:

```ts
id = 10;
isActive = true;
```

### Bước 2: kiểm tra user tồn tại

```ts
await this.repository.findById(10)
```

Kết quả là object:

```json
{
  "id": 10,
  "isActive": false
}
```

Object tồn tại nên:

```ts
!(userObject) // false
```

Không chạy `return null`.

### Bước 3: chạy transaction

```ts
this.prisma.$transaction(...)
```

Các thao tác tiếp theo nằm trong cùng transaction.

### Bước 4: `if (!isActive)` lần 1

Thay dữ liệu thật vào code:

```ts
if (!true) {
```

Tương đương:

```ts
if (false) {
```

Kết quả: **bỏ qua** `lockEssentialAdminGuard`.

Lý do: kích hoạt user không làm giảm số admin active, nên không cần guard này.

### Bước 5: cập nhật database

```ts
this.repository.setActive(10, true, transaction)
```

Repository thực hiện tương đương:

```sql
UPDATE users
SET is_active = true
WHERE id = 10;
```

Database sau cập nhật:

```json
{
  "id": 10,
  "is_active": true
}
```

Có một dòng được cập nhật nên:

```ts
updated = true;
```

Điều kiện này trở thành `if (!true)`, nên không return `null`:

```ts
if (!updated) return null;
```

### Bước 6: `if (!isActive)` lần 2

```ts
if (!true) {
```

Kết quả là `false`, nên bỏ qua:

- `revokeAllForUser`
- `assertEssentialAdminExists`

### Bước 7: trả dữ liệu mới

```ts
return this.repository.findById(10, transaction);
```

Kết quả:

```json
{
  "id": 10,
  "isActive": true
}
```

Transaction commit.

### Tóm tắt case `true`

```text
true
→ !true = false
→ bỏ qua guard lần 1
→ is_active = true
→ !true = false
→ bỏ qua thu hồi session và guard lần 2
→ trả user active
```

---

## 7. Trace case 2: `isActive = false`

### Dữ liệu đầu vào

Request:

```http
PATCH /api/users/10/status
```

```json
{ "isActive": false }
```

Database trước khi chạy:

```json
{
  "id": 10,
  "is_active": true
}
```

Giả sử user 10 có hai refresh token chưa bị thu hồi, và hệ thống còn một admin
active khác có đủ permission thiết yếu.

### Bước 1: controller gọi service

Sau khi Zod parse:

```ts
parsed.data.isActive === false;
```

Controller gọi:

```ts
this.service.setStatus(10, false);
```

Service nhận:

```ts
id = 10;
isActive = false;
```

### Bước 2: kiểm tra user tồn tại

```ts
await this.repository.findById(10)
```

Kết quả:

```json
{
  "id": 10,
  "isActive": true
}
```

User tồn tại nên không return `null`.

### Bước 3: chạy transaction

```ts
this.prisma.$transaction(...)
```

### Bước 4: `if (!isActive)` lần 1

Thay dữ liệu thật vào:

```ts
if (!false) {
```

Tương đương:

```ts
if (true) {
```

Khối này được chạy:

```ts
await this.rbacService.lockEssentialAdminGuard(transaction);
```

Giả sử 10 permission thiết yếu đều tồn tại:

```ts
count = 10;
ESSENTIAL_ADMIN_PERMISSIONS.length = 10;
```

Guard thành công, chương trình đi tiếp.

### Bước 5: cập nhật database

```ts
this.repository.setActive(10, false, transaction)
```

Repository thực hiện tương đương:

```sql
UPDATE users
SET is_active = false
WHERE id = 10;
```

Database tạm thời trong transaction:

```json
{
  "id": 10,
  "is_active": false
}
```

Có một dòng được cập nhật nên:

```ts
updated = true;
```

### Bước 6: `if (!isActive)` lần 2

```ts
if (!false) {
```

Tương đương:

```ts
if (true) {
```

Đây là phần xử lý **sau khi** user đã thành inactive.

#### 6a. Thu hồi refresh token

```ts
await this.sessionService.revokeAllForUser(10, transaction);
```

Hai token của user 10 trở thành:

```json
[
  { "user_id": 10, "is_revoked": true },
  { "user_id": 10, "is_revoked": true }
]
```

#### 6b. Kiểm tra còn admin thiết yếu

```ts
await this.rbacService.assertEssentialAdminExists(transaction);
```

Vì còn admin khác nên kết quả là:

```ts
true
```

Transaction tiếp tục.

### Bước 7: trả dữ liệu mới

```ts
return this.repository.findById(10, transaction);
```

Kết quả:

```json
{
  "id": 10,
  "isActive": false
}
```

Transaction commit. User bị vô hiệu hóa và refresh token bị thu hồi cùng nhau.

### Tóm tắt case `false`

```text
false
→ !false = true
→ chạy guard trước cập nhật
→ is_active = false
→ !false = true
→ thu hồi session
→ kiểm tra còn admin thiết yếu
→ trả user inactive
```

---

## 8. Nếu vô hiệu hóa admin cuối cùng thì sao?

Giả sử user 10 là admin active cuối cùng có đủ permission thiết yếu.

Các bước đầu vẫn chạy:

```text
lock guard
→ đổi is_active = false
→ thu hồi session
→ assertEssentialAdminExists() trả false
```

Hàm sẽ throw lỗi:

```text
ESSENTIAL_ADMIN_REQUIRED
```

Transaction rollback. Kết quả cuối cùng:

```text
user vẫn active
refresh token vẫn chưa bị thu hồi
```

Transaction đảm bảo không xảy ra tình trạng user đã bị vô hiệu hóa nhưng việc
kiểm tra an toàn lại thất bại.

---

## 9. Đọc code bằng ngôn ngữ đời thường

```ts
if (!(await this.repository.findById(id))) return null;
```

> Không có user thì dừng.

```ts
this.prisma.$transaction(...)
```

> Bắt đầu một nhóm thao tác database phải thành công cùng nhau.

```ts
if (!isActive) lockEssentialAdminGuard();
```

> Nếu đang vô hiệu hóa thì chuẩn bị bảo vệ admin cuối cùng.

```ts
updated = setActive(id, isActive);
```

> Ghi trạng thái mới vào database.

```ts
if (!updated) return null;
```

> Nếu không cập nhật được user thì dừng.

```ts
if (!isActive) {
  revokeAllForUser(id);
  assertEssentialAdminExists();
}
```

> Nếu vừa vô hiệu hóa thì thu hồi phiên và kiểm tra hệ thống vẫn còn admin.

```ts
return this.repository.findById(id, transaction);
```

> Đọc lại dữ liệu mới nhất và trả về cho controller.

---

## 10. Viết lại cho dễ đọc hơn

Nếu người mới thấy `!isActive` khó đọc, có thể diễn giải cùng logic bằng tên
biến rõ hơn:

```ts
const isDeactivating = isActive === false;

if (isDeactivating) {
  await this.rbacService.lockEssentialAdminGuard(transaction);
}

const updated = await this.repository.setActive(id, isActive, transaction);

if (isDeactivating) {
  await this.sessionService.revokeAllForUser(id, transaction);
  await this.rbacService.assertEssentialAdminExists(transaction);
}
```

`isDeactivating` nghĩa là “đang vô hiệu hóa”. Khi đó code dễ đọc thành:

```text
Nếu đang vô hiệu hóa:
  bảo vệ trước

Đổi trạng thái

Nếu đang vô hiệu hóa:
  thu hồi session và kiểm tra sau
```

Đây chỉ là cách diễn giải dễ đọc hơn, không phải một business rule mới.

---

## 11. Các dấu `!` khác trong hàm

### Kiểm tra user không tồn tại

```ts
if (!(await this.repository.findById(id))) return null;
```

Nếu `findById` trả `null`:

```ts
!null // true
```

thì return `null`.

Nếu trả về user object:

```ts
!userObject // false
```

thì đi tiếp.

### Kiểm tra cập nhật thất bại

```ts
if (!updated) return null;
```

- `updated = true` → `!updated = false` → đi tiếp.
- `updated = false` → `!updated = true` → return `null`.

---

## 12. Sơ đồ cuối cùng

```text
Request body
{ isActive: true/false }
        ↓
Controller validate z.boolean()
        ↓
service.setStatus(id, isActive)
        ↓
User tồn tại?
   ├─ Không → return null
   └─ Có
        ↓
isActive === false?
   ├─ Có → khóa guard admin
   └─ Không → bỏ qua
        ↓
Đổi users.is_active
        ↓
Cập nhật thành công?
   ├─ Không → return null
   └─ Có
        ↓
isActive === false?
   ├─ Có → thu hồi refresh token
   │       → kiểm tra còn admin
   └─ Không → bỏ qua
        ↓
Đọc user mới và commit transaction
```

## Câu cần nhớ

```ts
if (!isActive)
```

chỉ có nghĩa là:

> Nếu giá trị mới của `isActive` là `false`, tức đang vô hiệu hóa user.

Hai lần kiểm tra không thừa:

- Lần 1: bảo vệ **trước** khi đổi trạng thái.
- Lần 2: xử lý hậu quả và kiểm tra an toàn **sau** khi đổi trạng thái.
