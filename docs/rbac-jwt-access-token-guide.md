# RBAC Với JWT Access Token Cho Backend Hiện Tại

Tài liệu này hướng dẫn triển khai authentication và authorization RBAC cho backend hiện tại. Phạm vi: chỉ dùng **JWT access token**, chưa có refresh token.

## 1. Vấn đề hiện tại

Schema database hiện có các quan hệ:

```text
users
  -> user_roles
    -> roles
      -> role_permissions
        -> permissions
```

| Bảng | Vai trò |
| --- | --- |
| `users` | Thông tin người dùng |
| `roles` | Nhóm quyền như `admin`, `staff` |
| `permissions` | Một hành động cụ thể như `asset.read` |
| `user_roles` | Gán một hoặc nhiều role cho user |
| `role_permissions` | Gán nhiều permission cho một role |

Bảng `users` **không có** cột `role` hoặc `role_id`.

Vì vậy các phần hiện tại cần được thay đổi:

- [`auth.middleware.js`](../apps/backend/src/middleware/auth.middleware.js) đang dùng `req.user.roleId`.
- [`auth.service.js`](../apps/backend/src/services/auth.service.js) đang ghi/đọc `users.role_id`.
- Đây là sai với schema mới và sẽ lỗi khi chạy.

## 2. Tư duy RBAC: kiểm tra permission, không kiểm tra admin

Không viết:

```ts
if (user.role === 'admin') {
  // Cho phép
}
```

Route chỉ yêu cầu permission:

```text
HTTP request
  -> requireAuth
  -> requireAllPermissions('asset.create')
  -> controller
  -> service
  -> repository
  -> Prisma / MySQL
```

Ví dụ permission code:

| Hành động | Permission code |
| --- | --- |
| Xem asset | `asset.read` |
| Tạo asset | `asset.create` |
| Sửa asset | `asset.update` |
| Xóa asset | `asset.delete` |
| Xem user | `user.read` |
| Quản lý user/role | `user.manage` |
| Tạo yêu cầu mượn | `borrow.create` |
| Duyệt yêu cầu mượn | `borrow.approve` |
| Ghi nhận sửa chữa | `repair.manage` |

`permissions.code` hiện là `VARCHAR(30)`, nên code cần ngắn hơn hoặc bằng 30 ký tự.

Role `admin` chỉ là role được gán nhiều hoặc toàn bộ permission. Middleware không cần biết tên `admin`.

## 3. Chuẩn bị dữ liệu RBAC

Phải có dữ liệu trong `roles`, `permissions`, `role_permissions` và `user_roles` trước khi login.

Ví dụ:

```text
Role admin
  asset.read, asset.create, asset.update, asset.delete
  user.read, user.manage
  borrow.create, borrow.approve
  repair.manage

Role staff
  asset.read
  borrow.create
```

Nên tạo dữ liệu này bằng seed script riêng:

- Migration dùng cho cấu trúc bảng/cột/index.
- Seed dùng cho role, permission và mapping ban đầu.
- Sau này có thể tạo API quản trị role/permission.

Ví dụ SQL minh họa:

```sql
INSERT INTO roles (name) VALUES ('admin'), ('staff');

INSERT INTO permissions (name, code) VALUES
  ('View assets', 'asset.read'),
  ('Create assets', 'asset.create'),
  ('Update assets', 'asset.update'),
  ('Delete assets', 'asset.delete'),
  ('Manage users', 'user.manage');
```

Sau đó lấy ID để insert mapping vào `role_permissions` và `user_roles`.

## 4. JWT khi chưa có refresh token

### Lựa chọn khuyến nghị

Đưa permission code vào access token lúc login:

```json
{
  "sub": 12,
  "email": "staff@example.com",
  "permissionCodes": ["asset.read", "borrow.create"],
  "iat": 0,
  "exp": 0
}
```

Không đưa password, password hash hoặc dữ liệu nhạy cảm vào JWT.

Ưu điểm:

- Middleware không query database ở mọi request.
- Đơn giản cho giai đoạn đầu.
- Kiểm tra permission nhanh.

Nhược điểm:

- Nếu admin đổi role/permission, token cũ vẫn có quyền cũ đến khi hết hạn.

Vì chưa có refresh token, dùng access token ngắn: `15m` hoặc `30m`. Token hết hạn thì frontend yêu cầu user login lại.

Logout lúc này chỉ là frontend xóa access token. Server chưa thể thu hồi ngay token còn hạn. Sau này nếu cần thu hồi ngay khi đổi quyền/khóa user, mới xem xét `token_version`, session hoặc refresh token đã hash.

## 5. Cấu trúc file TypeScript

Không cần tạo interface kiểu `IAuthMiddleware`. Middleware chỉ cần tuân theo `RequestHandler` của Express.

```text
src/
  models/
    auth.model.ts                # AccessTokenPayload
  types/
    express.d.ts                 # Khai báo req.auth
  middleware/
    auth.middleware.ts           # requireAuth và permission guards
  repositories/
    auth.prisma.repository.ts    # Query user + role + permission khi login
```

Repository vẫn cần vì service không nên gọi Prisma trực tiếp. Khi refactor RBAC, chuyển query đăng nhập từ auth service sang `AuthPrismaRepository`.

## 6. Kiểu JWT và Express Request

Tạo `src/models/auth.model.ts`:

```ts
export interface AccessTokenPayload {
  sub: number;
  email: string;
  permissionCodes: string[];
}
```

Tạo `src/types/express.d.ts`:

```ts
import type { AccessTokenPayload } from '@/models/auth.model.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export {};
```

Dùng `req.auth`, không dùng `req.user`. Tên này cho biết dữ liệu đến từ access token và tránh xung đột với thư viện khác.

TypeScript không thay thế kiểm tra runtime. Sau `jwt.verify`, dùng Zod để xác nhận payload:

```ts
const accessTokenPayloadSchema = z.object({
  sub: z.number().int().positive(),
  email: z.email(),
  permissionCodes: z.array(z.string().min(1)),
});
```

## 7. Query user, role và permission khi login

Repository query quan hệ Prisma:

```ts
const user = await prisma.users.findUnique({
  where: { email },
  include: {
    user_roles: {
      include: {
        roles: {
          include: {
            role_permissions: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    },
  },
});
```

Sau khi `bcrypt.compare` xác nhận password, lấy permission không trùng:

```ts
const permissionCodes = [
  ...new Set(
    user.user_roles.flatMap((userRole) =>
      userRole.roles.role_permissions.map(
        (rolePermission) => rolePermission.permissions.code,
      ),
    ),
  ),
];
```

Ký token:

```ts
const payload: AccessTokenPayload = {
  sub: user.id,
  email: user.email,
  permissionCodes,
};

const token = jwt.sign(payload, process.env.JWT_SECRET!, {
  expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
});
```

Không hard-code `expiresIn: '30s'`. Dùng biến môi trường:

```env
JWT_SECRET=<secret-dai-va-ngau-nhien>
JWT_EXPIRES_IN=15m
```

Không trả password trong response login hoặc register.

## 8. Middleware TypeScript

### `requireAuth`

Trách nhiệm duy nhất:

1. Đọc đúng `Authorization: Bearer <token>`.
2. Header thiếu hoặc sai dạng: trả `401`.
3. Verify JWT bằng `JWT_SECRET`.
4. Validate payload bằng Zod.
5. Gán `req.auth`.
6. Gọi `next()`.

Pseudo-code:

```ts
export const requireAuth: RequestHandler = (req, res, next) => {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    ApiResponse.unauthorized(res, 'Missing or malformed access token');
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.auth = accessTokenPayloadSchema.parse(decoded);
    next();
  } catch {
    ApiResponse.unauthorized(res, 'Invalid or expired access token');
  }
};
```

### `requireAllPermissions`

Dùng khi user phải có tất cả permission:

```ts
export function requireAllPermissions(
  ...requiredCodes: string[]
): RequestHandler {
  return (req, res, next) => {
    const granted = new Set(req.auth?.permissionCodes ?? []);

    if (!requiredCodes.every((code) => granted.has(code))) {
      ApiResponse.forbidden(res, 'Missing required permission');
      return;
    }

    next();
  };
}
```

### `requireAnyPermissions`

Dùng khi chỉ cần một permission:

```ts
export function requireAnyPermissions(
  ...requiredCodes: string[]
): RequestHandler {
  return (req, res, next) => {
    const granted = new Set(req.auth?.permissionCodes ?? []);

    if (!requiredCodes.some((code) => granted.has(code))) {
      ApiResponse.forbidden(res, 'Missing required permission');
      return;
    }

    next();
  };
}
```

Luôn đặt `requireAuth` trước permission middleware.

## 9. Response 401 và 403

Thêm vào [`src/shared/api-response.ts`](../apps/backend/src/shared/api-response.ts):

```ts
static unauthorized(res: Response, message = 'Unauthorized'): void {
  res.status(401).json({ error: message });
}

static forbidden(res: Response, message = 'Forbidden'): void {
  res.status(403).json({ error: message });
}
```

| Status | Khi nào |
| --- | --- |
| `401` | Không có token, token sai, token hết hạn |
| `403` | Token hợp lệ nhưng thiếu permission |

## 10. Bảo vệ route

Ví dụ route asset:

```ts
router.get(
  '/',
  requireAuth,
  requireAllPermissions('asset.read'),
  assetController.getAll,
);

router.post(
  '/',
  requireAuth,
  requireAllPermissions('asset.create'),
  assetController.create,
);

router.delete(
  '/:id',
  requireAuth,
  requireAllPermissions('asset.delete'),
  assetController.delete,
);
```

[`src/shared/rest-router.ts`](../apps/backend/src/shared/rest-router.ts) hiện chỉ nhận controller. Có hai lựa chọn:

1. Viết route thủ công cho resource có permission khác nhau theo từng HTTP method.
2. Mở rộng `createRestRouter` để nhận middleware theo action.

Không đặt logic permission trong controller. Controller chỉ nhận request đã xác thực/phân quyền.

## 11. Register và gán role

Register không được ghi `role_id` vào `users`.

Nếu dùng một role mặc định, repository tạo user và mapping trong một transaction:

```ts
await prisma.users.create({
  data: {
    department_id: input.departmentId,
    name: input.name,
    password: passwordHash,
    email: input.email,
    phone: input.phone,
    user_roles: {
      create: { role_id: staffRoleId },
    },
  },
});
```

Nếu user có nhiều role, input nội bộ dùng `roleIds: number[]` và tạo nhiều dòng `user_roles`.

Cảnh báo bảo mật: API register public không được cho client tự gửi role admin. Register public nên luôn gán role mặc định an toàn; chỉ endpoint có `user.manage` mới được gán/sửa role tùy ý.

## 12. Thứ tự triển khai

1. Seed roles, permissions, role_permissions và một user admin ban đầu.
2. Tạo `AccessTokenPayload` và Express Request augmentation.
3. Tạo `AuthPrismaRepository` lấy user, role, permission khi login.
4. Sửa auth service: verify password, tạo permissionCodes, ký JWT theo `JWT_EXPIRES_IN`.
5. Chuyển middleware hiện tại sang TypeScript: `requireAuth`, `requireAllPermissions`, `requireAnyPermissions`.
6. Thêm `unauthorized` và `forbidden` vào ApiResponse.
7. Gắn middleware trước từng route cần bảo vệ.
8. Sửa register để ghi `user_roles`, không ghi `users.role_id`.
9. Chạy `pnpm --filter backend typecheck` sau các thay đổi backend.

## 13. Checklist test thủ công

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Không có Authorization header | 401 |
| Gửi `Basic ...` thay vì `Bearer ...` | 401 |
| JWT sai hoặc hết hạn | 401 |
| JWT hợp lệ có `asset.read`, gọi GET asset | 200 |
| JWT hợp lệ thiếu `asset.delete`, gọi DELETE asset | 403 |
| User có hai role và permission trùng | JWT chỉ chứa một permission code |
| Thay role của user | Token cũ chỉ có quyền đến hết JWT_EXPIRES_IN |
| Register public tự gửi role admin | Server bỏ qua hoặc từ chối role đó |

## 14. Những điều không làm

1. Không hard-code `if (role === 'admin')`.
2. Không tin role/permission frontend gửi trong request body.
3. Không đưa password vào JWT hoặc response.
4. Không dùng `role_id` trực tiếp trên bảng `users`.
5. Không query Prisma trực tiếp trong controller.
6. Không thêm refresh token, blacklist hoặc session khi chưa có yêu cầu nghiệp vụ.

## Tham chiếu trong repo

- [Schema Prisma](../apps/backend/prisma/schema.prisma)
- [Middleware hiện tại](../apps/backend/src/middleware/auth.middleware.js)
- [Auth service hiện tại](../apps/backend/src/services/auth.service.js)
- [Hướng dẫn Prisma migration](prisma-migration-newbie-guide.md)
