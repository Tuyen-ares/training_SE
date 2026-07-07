# Chuyển bài HTTP số 2 từ JavaScript sang TypeScript

Tài liệu này chuyển code trong `training/http/bai2.js` sang TypeScript và giải
thích những cú pháp khác JavaScript.

Mục tiêu không chỉ là đổi đuôi `.js` thành `.ts`. Sau khi chuyển đổi, TypeScript
phải kiểm tra được luồng dependency:

```text
HTTP Server
    ↓
AssetController
    ↓
AssetService
    ↓
IAssetRepository
    ↓
AssetRepository
    ↓
MySQL Pool
```

## 1. Bài 2 hiện tại đang dùng gì?

Code hiện tại đã có ba ý tưởng kiến trúc quan trọng:

- Repository Pattern: `AssetRepository` chịu trách nhiệm truy cập MySQL.
- Service Layer: `AssetService` chứa quy tắc nghiệp vụ.
- Dependency Injection: repository được truyền vào service, service được truyền
  vào controller.

```js
const repository = new AssetRepository(pool);
const service = new AssetService(repository);
const controller = new AssetController(service);
```

`bai2.js` là **Composition Root**, tức là nơi tạo và nối các object lại với nhau.

## 2. Vì sao không chỉ đổi `.js` thành `.ts`?

Nếu chỉ đổi tên file nhưng vẫn viết:

```ts
class AssetService {
  constructor(assetRepository: any) {
    this.assetRepository = assetRepository;
  }
}
```

thì gần như toàn bộ lợi ích của TypeScript đã bị mất vì `any` tắt kiểm tra kiểu.

Phiên bản đúng nên mô tả contract:

```ts
class AssetService {
  constructor(
    private readonly assetRepository: IAssetRepository,
  ) {}
}
```

TypeScript lúc này kiểm tra rằng dependency phải có đúng các method mà service
cần.

## 3. Cấu trúc sau khi chuyển đổi

Có thể giữ cấu trúc hiện tại và đổi các file liên quan sang `.ts`:

```text
training/http/
├── bai2.ts
├── tsconfig.json
├── package.json
├── controller/
│   └── assetsController.ts
├── data/
│   └── database.ts
├── helpers/
│   ├── parseHttp.ts
│   └── response.ts
├── method/
│   └── method.ts
├── model/
│   └── assets.ts
├── repository/
│   └── assetsRepository.ts
├── routing/
│   └── assetsRouting.ts
└── service/
    └── assetsService.ts
```

Không nên để một nửa dependency là CommonJS `.js` và một nửa là ESM `.ts` trong
lúc mới học. Hãy chuyển toàn bộ các file mà `bai2.ts` sử dụng.

## 4. Cài TypeScript

Chạy trong thư mục `training/http`:

```powershell
npm install --save-dev typescript tsx @types/node
```

`mysql2` đã cung cấp type nên không cần cài `@types/mysql2`.

Giữ các dependency và script cũ, sau đó bổ sung các script TypeScript. Không
thêm `"type": "module"` vì các bài JavaScript khác trong cùng thư mục vẫn đang
dùng CommonJS `require()`:

```json
{
  "scripts": {
    "start": "node rawTcpServer.js",
    "dev": "nodemon rawTcpServer.js",
    "dev:bai2:ts": "tsx watch bai2.ts",
    "typecheck:bai2:ts": "tsc --noEmit",
    "build:bai2:ts": "tsc",
    "start:bai2:ts": "node dist/bai2.js"
  },
  "dependencies": {
    "dotenv": "^17.4.2",
    "mysql2": "^3.22.5",
    "nodemon": "^3.1.14",
    "qrcode": "^1.5.4",
    "uuid": "^14.0.1"
  },
  "devDependencies": {
    "@types/node": "^26.0.0",
    "tsx": "^4.0.0",
    "typescript": "^6.0.0"
  }
}
```

Phiên bản package thực tế có thể khác. Không cần ép version đúng như ví dụ nếu
package đã được cài.

## 5. Tạo `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true
  },
  "include": [
    "bai2.ts",
    "controller/**/*.ts",
    "data/**/*.ts",
    "helpers/**/*.ts",
    "method/**/*.ts",
    "model/**/*.ts",
    "repository/**/*.ts",
    "routing/**/*.ts",
    "service/**/*.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

Ý nghĩa của các option quan trọng:

| Option | Tác dụng |
|---|---|
| `strict` | Bật kiểm tra kiểu nghiêm ngặt |
| `CommonJS` | Tương thích các bài JavaScript đang dùng `require()` |
| `rootDir` | Thư mục chứa source |
| `outDir` | Nơi chứa JavaScript sau khi build |
| `noUncheckedIndexedAccess` | Truy cập array/object index an toàn hơn |

## 6. Model và DTO

Thay `model/assets.js` bằng `model/assets.ts`:

```ts
export interface Asset {
  id: number;
  type_id: number;
  name: string;
  status: string;
  qr_code: string;
  create_at?: Date | string;
}

export interface CreateAssetDto {
  type_id: number;
  name: string;
  status: string;
}

export function isCreateAssetDto(
  input: unknown,
): input is CreateAssetDto {
  if (typeof input !== 'object' || input === null) {
    return false;
  }

  const value = input as Record<string, unknown>;

  return (
    typeof value.type_id === 'number' &&
    Number.isInteger(value.type_id) &&
    typeof value.name === 'string' &&
    typeof value.status === 'string'
  );
}
```

### Vì sao dùng `interface` thay cho class model?

Model cũ chỉ giữ dữ liệu và không có behavior:

```js
class AssetModel {
  constructor(id, type_id, name, status, qr_code) {
    this.id = id;
    this.type_id = type_id;
    this.name = name;
    this.status = status;
    this.qr_code = qr_code;
  }
}
```

Với object dữ liệu đơn giản, `interface` phù hợp hơn:

```ts
const asset: Asset = {
  id: 1,
  type_id: 2,
  name: 'Laptop',
  status: 'available',
  qr_code: 'abc',
};
```

`interface` chỉ tồn tại khi TypeScript kiểm tra code. Nó không tồn tại ở runtime.
Vì thế `isCreateAssetDto()` vẫn cần thiết để kiểm tra JSON do client gửi lên.

TypeScript không tự động đảm bảo dữ liệu bên ngoài là đúng:

```ts
const body = JSON.parse(rawBody);
```

Kết quả từ `JSON.parse()` có thể chứa bất kỳ dữ liệu nào.

## 7. HTTP method

Thay `method/method.js` bằng `method/method.ts`:

```ts
export const RequestMethod = {
  GET: 'GET',
  POST: 'POST',
} as const;

export type RequestMethod =
  (typeof RequestMethod)[keyof typeof RequestMethod];
```

`as const` làm cho giá trị có kiểu literal:

```ts
RequestMethod.GET;
// Kiểu là "GET", không phải string chung chung.
```

Code JavaScript hiện tại có một lỗi import:

```js
// method.js
module.exports = { RequestMethod };

// bai2.js
const RequestMethod = require('./method/method');
```

Giá trị thật nhận được là:

```js
{
  RequestMethod: {
    GET: 'GET',
    POST: 'POST'
  }
}
```

Do đó `RequestMethod.GET` trong `bai2.js` là `undefined`. Nếu tiếp tục dùng
CommonJS thì phải destructuring:

```js
const { RequestMethod } = require('./method/method');
```

Khi chuyển sang TypeScript ESM, named import thể hiện rõ contract:

```ts
import { RequestMethod } from './method/method';
```

## 8. Routing constant

Thay `routing/assetsRouting.js` bằng `routing/assetsRouting.ts`:

```ts
export const AssetRouting = {
  GET_ASSET: '/assets',
  ADD_ASSET: '/assets',
} as const;
```

Không cần tạo class cho một nhóm constant.

## 9. Kết nối database

Thay `data/database.js` bằng `data/database.ts`:

```ts
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createPool } from 'mysql2/promise';

dotenv.config({
  path: resolve(process.cwd(), '.env'),
});

const port = process.env.DB_PORT
  ? Number(process.env.DB_PORT)
  : 3306;

const pool = createPool({
  host: process.env.DB_HOST,
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
```

Khác biệt cần chú ý:

- `process.cwd()` là thư mục chạy lệnh; các lệnh trong tài liệu được chạy tại
  `training/http`.
- `process.env.DB_PORT` có kiểu `string | undefined`.
- MySQL cần `port` là number nên phải dùng `Number(...)`.
- Import từ `mysql2/promise` để nhận pool promise trực tiếp.

Trong ứng dụng thật nên kiểm tra các biến môi trường bắt buộc trước khi tạo
pool. Không nên dùng `as string` chỉ để che lỗi cấu hình.

## 10. Repository interface và implementation

Thay `repository/assetsRepository.js` bằng
`repository/assetsRepository.ts`:

```ts
import type {
  Pool,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import type {
  Asset,
  CreateAssetDto,
} from '../model/assets';

interface AssetRow extends RowDataPacket {
  id: number;
  type_id: number;
  name: string;
  status: string;
  qr_code: string;
  create_at?: Date;
}

export interface IAssetRepository {
  getAllAssets(): Promise<Asset[]>;
  addAsset(
    data: CreateAssetDto,
    qrCode: string,
  ): Promise<Asset>;
}

export default class AssetRepository
  implements IAssetRepository {
  constructor(private readonly pool: Pool) {}

  async getAllAssets(): Promise<Asset[]> {
    const [rows] = await this.pool.query<AssetRow[]>(
      'SELECT * FROM assets',
    );

    return rows;
  }

  async addAsset(
    data: CreateAssetDto,
    qrCode: string,
  ): Promise<Asset> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO assets
        (type_id, name, status, qr_code)
       VALUES (?, ?, ?, ?)`,
      [data.type_id, data.name, data.status, qrCode],
    );

    return {
      id: result.insertId,
      type_id: data.type_id,
      name: data.name,
      status: data.status,
      qr_code: qrCode,
    };
  }
}
```

### Interface ở đây giải quyết gì?

`IAssetRepository` là contract mà service cần:

```text
AssetService → IAssetRepository ← AssetRepository dùng MySQL
                                  ← FakeAssetRepository dùng khi test
```

Service không cần import `Pool`, không cần biết SQL và không cần biết MySQL.

### `implements` có ý nghĩa gì?

Nếu repository quên method:

```ts
class AssetRepository implements IAssetRepository {
  // Quên addAsset()
}
```

TypeScript báo lỗi trước khi chạy chương trình.

## 11. Service

Thay `service/assetsService.js` bằng `service/assetsService.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type {
  Asset,
  CreateAssetDto,
} from '../model/assets';
import type {
  IAssetRepository,
} from '../repository/assetsRepository';

export class AssetValidationError extends Error {}

export default class AssetService {
  constructor(
    private readonly assetRepository: IAssetRepository,
  ) {}

  getAllAssets(): Promise<Asset[]> {
    return this.assetRepository.getAllAssets();
  }

  async addAsset(data: CreateAssetDto): Promise<Asset> {
    if (data.name.trim().length < 3) {
      throw new AssetValidationError(
        'Tên tài sản phải có ít nhất 3 ký tự',
      );
    }

    const qrCode = randomUUID();

    return this.assetRepository.addAsset(data, qrCode);
  }
}
```

### `private readonly` khác JavaScript ra sao?

```ts
constructor(
  private readonly assetRepository: IAssetRepository,
) {}
```

Đây là cú pháp rút gọn của:

```ts
private readonly assetRepository: IAssetRepository;

constructor(assetRepository: IAssetRepository) {
  this.assetRepository = assetRepository;
}
```

- `private`: chỉ `AssetService` được truy cập property.
- `readonly`: không được gán repository khác sau constructor.
- `IAssetRepository`: dependency phải đúng contract.

Các kiểm tra trên chủ yếu xảy ra lúc compile. JavaScript build ra gần tương
đương:

```js
constructor(assetRepository) {
  this.assetRepository = assetRepository;
}
```

## 12. Parse request body

Thay `helpers/parseHttp.js` bằng `helpers/parseHttp.ts`:

```ts
import type { IncomingMessage } from 'node:http';

export function parseBody(
  req: IncomingMessage,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';

    req.setEncoding('utf8');

    req.on('data', (chunk: string) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body) as unknown);
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}
```

Hàm trả về `unknown`, không trả thẳng `CreateAssetDto`, vì dữ liệu từ HTTP chưa
được tin cậy.

Khác nhau:

```ts
const value: any = await parseBody(req);
value.foo.bar(); // TypeScript cho qua, có thể lỗi runtime.
```

```ts
const value: unknown = await parseBody(req);
value.foo; // TypeScript không cho phép nếu chưa kiểm tra.
```

`unknown` an toàn hơn `any` tại boundary như HTTP, database không kiểm soát và
API bên ngoài.

## 13. Response helper

Thay `helpers/response.js` bằng `helpers/response.ts`:

```ts
import type { ServerResponse } from 'node:http';

export function resEnd<T>(
  res: ServerResponse,
  status: number,
  data: T,
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });

  res.end(JSON.stringify(data));
}

export function resError(
  res: ServerResponse,
  status: number,
  message: string,
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });

  res.end(JSON.stringify({ error: message }));
}
```

`<T>` là generic. Hàm có thể nhận nhiều loại dữ liệu nhưng vẫn giữ kiểu:

```ts
resEnd<Asset[]>(res, 200, assets);
resEnd<Asset>(res, 201, asset);
```

TypeScript thường tự suy luận `T`, vì vậy không bắt buộc ghi `<Asset[]>`.

## 14. Controller

Thay `controller/assetsController.js` bằng
`controller/assetsController.ts`:

```ts
import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import { isCreateAssetDto } from '../model/assets';
import { parseBody } from '../helpers/parseHttp';
import {
  resEnd,
  resError,
} from '../helpers/response';
import AssetService, {
  AssetValidationError,
} from '../service/assetsService';

export default class AssetController {
  constructor(
    private readonly assetService: AssetService,
  ) {}

  getAllAssets = async (
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    try {
      const assets = await this.assetService.getAllAssets();
      resEnd(res, 200, assets);
    } catch (error: unknown) {
      console.error(error);
      resError(res, 500, 'Internal Server Error');
    }
  };

  addAsset = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    let body: unknown;

    try {
      body = await parseBody(req);
    } catch {
      resError(res, 400, 'Invalid JSON');
      return;
    }

    if (!isCreateAssetDto(body)) {
      resError(res, 400, 'Invalid asset data');
      return;
    }

    try {
      const asset = await this.assetService.addAsset(body);
      resEnd(res, 201, asset);
    } catch (error: unknown) {
      if (error instanceof AssetValidationError) {
        resError(res, 400, error.message);
        return;
      }

      console.error(error);
      resError(res, 500, 'Internal Server Error');
    }
  };
}
```

### Vì sao method dùng arrow function?

Router truyền method như callback:

```ts
controller.getAllAssets;
```

Arrow property giữ đúng giá trị `this`. Nếu dùng method thông thường:

```ts
async getAllAssets(req, res) {}
```

thì khi truyền callback có thể phải bind:

```ts
controller.getAllAssets.bind(controller);
```

### Vì sao `catch (error: unknown)`?

JavaScript cho phép throw bất kỳ giá trị nào:

```js
throw new Error('Failure');
throw 'Failure';
throw 123;
```

Do đó phải kiểm tra trước khi đọc `error.message`:

```ts
if (error instanceof Error) {
  console.log(error.message);
}
```

## 15. File `bai2.ts`

Thay `bai2.js` bằng:

```ts
import { createServer } from 'node:http';
import { RequestMethod } from './method/method';
import { AssetRouting } from './routing/assetsRouting';
import AssetRepository from './repository/assetsRepository';
import AssetService from './service/assetsService';
import AssetController from './controller/assetsController';
import pool from './data/database';

const assetRepository = new AssetRepository(pool);
const assetService = new AssetService(assetRepository);
const assetController = new AssetController(assetService);

const server = createServer((req, res) => {
  const method = req.method;
  const host = req.headers.host ?? 'localhost:3000';
  const requestUrl = req.url ?? '/';
  const pathname = new URL(
    requestUrl,
    `http://${host}`,
  ).pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type',
  );

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (
    method === RequestMethod.GET &&
    pathname === AssetRouting.GET_ASSET
  ) {
    void assetController.getAllAssets(req, res);
    return;
  }

  if (
    method === RequestMethod.POST &&
    pathname === AssetRouting.ADD_ASSET
  ) {
    void assetController.addAsset(req, res);
    return;
  }

  res.writeHead(404, {
    'Content-Type': 'application/json; charset=utf-8',
  });

  res.end(JSON.stringify({
    error: 'Route not found',
  }));
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

Vì server được tạo bằng `node:http`, protocol thực tế là HTTP. Không cần kiểm
tra `req.socket.encrypted`. Nếu muốn HTTPS trực tiếp thì phải tạo server bằng
`node:https` và cung cấp certificate.

### Vì sao import không ghi extension?

Tài liệu chọn `module: "CommonJS"` để các bài JavaScript cũ trong
`training/http` tiếp tục chạy:

```ts
import AssetService from './service/assetsService';
```

TypeScript compile câu lệnh này thành `require()` trong thư mục `dist`.

Boilerplate chính dùng ESM với `NodeNext`, nên code trong boilerplate ghi `.js`
trong đường dẫn import dù source là `.ts`. Hai cách đều hợp lệ, nhưng không nên
trộn hai module system nếu chưa có lý do rõ ràng.

## 16. So sánh nhanh cú pháp JavaScript và TypeScript

### Import/export

JavaScript CommonJS:

```js
const AssetService = require('./service/assetsService');
module.exports = AssetService;
```

TypeScript ESM:

```ts
import AssetService from './service/assetsService';
export default AssetService;
```

Named export:

```ts
export const RequestMethod = {
  GET: 'GET',
} as const;
```

```ts
import { RequestMethod } from './method/method';
```

### Kiểu tham số và kiểu trả về

JavaScript:

```js
async function findById(id) {
  // ...
}
```

TypeScript:

```ts
async function findById(
  id: number,
): Promise<Asset | null> {
  // ...
}
```

### Object contract

JavaScript:

```js
// Chỉ dựa vào convention.
const asset = {
  id: 1,
  name: 'Laptop',
};
```

TypeScript:

```ts
interface Asset {
  id: number;
  name: string;
}

const asset: Asset = {
  id: 1,
  name: 'Laptop',
};
```

### Dependency injection

JavaScript:

```js
constructor(repository) {
  this.repository = repository;
}
```

TypeScript:

```ts
constructor(
  private readonly repository: IAssetRepository,
) {}
```

### Implement interface

JavaScript:

```js
// Không có kiểm tra implements ở compile time.
class AssetRepository {}
```

TypeScript:

```ts
class AssetRepository implements IAssetRepository {
  // Bắt buộc có đủ method.
}
```

### Dữ liệu chưa tin cậy

JavaScript:

```js
const body = JSON.parse(raw);
body.name.trim();
```

TypeScript:

```ts
const body: unknown = JSON.parse(raw);

if (isCreateAssetDto(body)) {
  body.name.trim();
}
```

### Optional value

JavaScript:

```js
const url = req.url || '/';
```

TypeScript:

```ts
const url: string = req.url ?? '/';
```

`||` thay thế cả chuỗi rỗng, `0` và `false`. `??` chỉ thay thế `null` hoặc
`undefined`.

## 17. Có nên tạo `shared/base.repository.ts` ngay không?

Chưa cần cho bài 2.

Hiện tại Asset chỉ có hai thao tác:

```text
getAllAssets
addAsset
```

Tạo generic base CRUD có năm method ngay lúc này làm abstraction lớn hơn nhu
cầu.

Chỉ nên đưa contract chung vào `shared` khi User, Asset và các resource khác
thật sự dùng cùng một CRUD contract:

```ts
// shared/base.repository.ts
export interface IBaseRepository<
  TEntity,
  TCreateDto,
  TUpdateDto
> {
  findAll(): Promise<TEntity[]>;
  findById(id: number): Promise<TEntity | null>;
  create(dto: TCreateDto): Promise<TEntity>;
  update(
    id: number,
    dto: TUpdateDto,
  ): Promise<TEntity | null>;
  delete(id: number): Promise<boolean>;
}
```

Repository riêng mở rộng contract:

```ts
export interface IAssetRepository
  extends IBaseRepository<
    Asset,
    CreateAssetDto,
    UpdateAssetDto
  > {
  findByQrCode(qrCode: string): Promise<Asset | null>;
}
```

### Khi nào dùng abstract class?

Interface chỉ mô tả method bắt buộc, không chứa implementation:

```ts
interface IBaseRepository<TEntity> {
  findAll(): Promise<TEntity[]>;
}
```

Abstract class vừa có thể chứa code dùng chung, vừa yêu cầu subclass triển khai
phần còn thiếu:

```ts
export abstract class BaseRepository<TEntity> {
  abstract findAll(): Promise<TEntity[]>;

  protected logQuery(query: string): void {
    console.log(query);
  }
}
```

Concrete repository:

```ts
class AssetRepository
  extends BaseRepository<Asset> {
  async findAll(): Promise<Asset[]> {
    this.logQuery('SELECT * FROM assets');
    // Query database...
    return [];
  }
}
```

Quy tắc chọn:

- Chỉ cần contract: dùng `interface`.
- Có implementation hoặc state dùng chung: cân nhắc `abstract class`.
- Chỉ có một implementation nhỏ: class cụ thể thường đã đủ.
- Không tạo base class chỉ vì boilerplate có base class.

## 18. Kiểm tra sau khi chuyển

### Bước 1: kiểm tra type

```powershell
npm run typecheck:bai2:ts
```

Phải sửa hết lỗi type thay vì thêm `any` để bỏ qua.

### Bước 2: chạy development server

```powershell
npm run dev:bai2:ts
```

### Bước 3: gọi API

Lấy danh sách:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3000/assets
```

Tạo asset:

```powershell
$body = @{
  type_id = 1
  name = 'Laptop Dell'
  status = 'available'
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/assets `
  -ContentType 'application/json' `
  -Body $body
```

### Bước 4: build JavaScript

```powershell
npm run build:bai2:ts
npm run start:bai2:ts
```

TypeScript không chạy trực tiếp trong production. `tsc` tạo JavaScript trong
`dist/`, sau đó Node chạy file JavaScript đã build.

## 19. Những lỗi cần tránh

### Dùng `any` cho mọi dependency

Không nên:

```ts
constructor(repository: any) {}
```

Nên:

```ts
constructor(repository: IAssetRepository) {}
```

### Ép kiểu JSON mà không validate

Không nên:

```ts
const body = await parseBody(req) as CreateAssetDto;
```

`as` chỉ nói với compiler rằng “hãy tin tôi”, không kiểm tra dữ liệu runtime.

Nên:

```ts
const body = await parseBody(req);

if (!isCreateAssetDto(body)) {
  resError(res, 400, 'Invalid asset data');
  return;
}
```

### Để Service biết HTTP

Không nên:

```ts
class AssetService {
  addAsset(req: IncomingMessage, res: ServerResponse) {}
}
```

Service chỉ nhận DTO và trả entity:

```ts
addAsset(dto: CreateAssetDto): Promise<Asset>
```

### Để Repository quyết định status code

Repository không nên trả HTTP 404/500. Nó chỉ trả dữ liệu, `null` hoặc throw lỗi
truy cập database.

### Tạo base class quá sớm

Generic và abstract giúp tái sử dụng, nhưng cũng làm code khó đọc hơn. Chỉ tạo
`BaseRepository`, `BaseService` và `BaseController` khi có nhiều resource thực
sự lặp cùng một cấu trúc.

## 20. Kết luận

Việc chuyển bài 2 sang TypeScript đem lại giá trị chính tại các ranh giới:

- HTTP body bắt đầu là `unknown`.
- Controller validate rồi mới tạo `CreateAssetDto`.
- Service phụ thuộc `IAssetRepository`, không phụ thuộc MySQL.
- Repository nhận `Pool` có type rõ ràng.
- Model và kết quả trả về được kiểm tra xuyên suốt.

TypeScript không thay thế validation runtime và không tự làm kiến trúc tốt hơn.
Nó giúp compiler kiểm tra rằng kiến trúc và contract đã khai báo đang được tuân
thủ.
