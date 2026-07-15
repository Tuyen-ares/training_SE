# Prisma Migration Cho Người Mới Bắt Đầu

Tài liệu này giải thích database, Prisma schema, migration và cách cả team làm việc an toàn với chúng.

## 1. Bức tranh lớn

Có bốn phần liên quan:

~~~text
Code Node.js/TypeScript
        |
        | gọi Prisma Client, ví dụ: prisma.products.findMany()
        v
prisma/schema.prisma
        |
        | mô tả bảng, cột, quan hệ
        v
MySQL database
        |
        | lưu bảng và dữ liệu thật
        v
products, users, ...
~~~

Migration là nhật ký thay đổi:

~~~text
prisma/migrations/20260714103000_add_product_description/migration.sql
~~~

| Thành phần | Là gì | Ví dụ |
| --- | --- | --- |
| Database | Nơi MySQL lưu bảng và dữ liệu thật | Bảng products có 20 dòng dữ liệu |
| Prisma schema | File mô tả database để Prisma biết cách dùng | model products { ... } |
| Migration | Lịch sử thay đổi database | ALTER TABLE products ADD description ... |

Schema là ảnh chụp cấu trúc mong muốn hiện tại. Migration là các bước đã đi từ cấu trúc cũ sang cấu trúc mới. Git lưu migration, nhưng Git không lưu database của mỗi người.

## 2. Ý nghĩa các lệnh Prisma

Chạy các lệnh bên dưới từ thư mục apps/backend.

| Lệnh | Tác động | Có sửa database đang kết nối? | Dùng khi nào |
| --- | --- | --- | --- |
| prisma db pull | Đọc database, ghi lại schema.prisma | Không | Database đã tồn tại, Prisma schema đang cũ |
| prisma generate | Tạo Prisma Client trong generated/prisma | Không | Sau khi schema đổi |
| prisma migrate dev | Tạo migration mới và áp nó | Có | Chỉ database dev riêng |
| prisma migrate deploy | Áp migration đã có trong Git | Có | Staging, production, CI/CD |
| prisma migrate reset | Xóa/reset database rồi chạy lại migration | Có, phá dữ liệu | Chỉ database test/dev có thể xóa |
| prisma migrate resolve | Ghi nhận migration đã áp dụng | Chỉ ghi bảng _prisma_migrations | Baseline database đã tồn tại |

Prisma 7 của dự án này không tự chạy generate sau migrate dev. Hãy chạy npx prisma generate rõ ràng.

## 3. Tình huống hiện tại

Bạn đã tạo database mới và database này hiện có một bảng. Số lượng bảng không quan trọng: một bảng hay một trăm bảng đều là database đã tồn tại.

Có hai trường hợp:

1. Bảng có dữ liệu cần giữ: dùng db pull, sau đó tạo baseline.
2. Bảng/dữ liệu chỉ để test và có thể xóa: có thể reset database và bắt đầu bằng migration init.

Tài liệu này ưu tiên trường hợp 1 vì an toàn hơn.

### Kiểm tra đúng database trước

Prisma CLI đọc DATABASE_URL trong .env. Runtime backend trong [apps/backend/src/prisma.ts](../apps/backend/src/prisma.ts) lại kết nối bằng DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME. Hai cấu hình phải chỉ đến cùng một database.

Nếu MySQL GUI hiện một bảng mới, nhưng db pull vẫn ra nhiều model bảng cũ, dừng lại. DATABASE_URL đang chỉ sang database cũ.

Mẫu .env local, không commit:

~~~env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=asset_dev_hoant
DATABASE_URL="mysql://root:your_password@localhost:3306/asset_dev_hoant"
~~~

## 4. Baseline là gì?

Baseline là mốc bắt đầu cho lịch sử migration.

Ví dụ database đã có bảng products và có dữ liệu, nhưng thư mục prisma/migrations chưa có gì. Migration khởi tạo sẽ có SQL như sau:

~~~sql
CREATE TABLE products (...);
~~~

Nếu chạy SQL này trên database hiện tại, nó lỗi vì products đã tồn tại.

Baseline làm hai việc:

1. Tạo file 0_init/migration.sql mô tả cách tạo database hiện tại từ trắng.
2. Báo Prisma: database này đã có sẵn kết quả của 0_init; hãy ghi 0_init là đã áp dụng, nhưng đừng chạy SQL tạo bảng nữa.

Baseline không copy dữ liệu. Nó chỉ lưu cấu trúc bảng, cột, khóa ngoại và index.

Tại sao phải giữ file 0_init? Khi một dev mới tạo database trống, Prisma có thể chạy 0_init để tạo bảng ban đầu. Database cũ có dữ liệu chỉ được đánh dấu đã áp dụng 0_init.

## 5. Baseline database hiện tại, giữ dữ liệu

Chỉ làm một lần sau khi backup database. Đừng làm nếu chưa chắc DATABASE_URL trỏ đúng database mới.

### Bước 1: Lấy cấu trúc thật từ MySQL

~~~powershell
cd apps/backend
npx prisma db pull --config prisma.config.ts
npx prisma generate --config prisma.config.ts
~~~

Mở prisma/schema.prisma và xác nhận nó chỉ mô tả bảng mới. db pull không tạo, xóa hay sửa dữ liệu trong MySQL.

### Bước 2: Tạo migration khởi tạo

~~~powershell
New-Item -ItemType Directory -Force prisma/migrations/0_init
$sql = npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
[System.IO.File]::WriteAllLines(
  (Join-Path $PWD 'prisma/migrations/0_init/migration.sql'),
  [string[]]$sql,
  [System.Text.UTF8Encoding]::new($false)
)
~~~

Kiểm tra file prisma/migrations/0_init/migration.sql. Nó phải có SQL tạo đúng bảng hiện có.

Không dùng `Out-File -Encoding utf8` trong Windows PowerShell 5.1 cho file migration: nó thêm BOM ở đầu file, MySQL có thể báo lỗi cú pháp khi Prisma chạy migration trong shadow database. Lệnh bên trên ghi UTF-8 không BOM.

### Bước 3: Đánh dấu baseline đã áp dụng

~~~powershell
npx prisma migrate resolve --applied 0_init --config prisma.config.ts
~~~

Lệnh này chỉ tạo/dùng bảng _prisma_migrations và ghi một dòng 0_init. Nó không chạy SQL trong 0_init, nên không tạo lại bảng và không làm mất dữ liệu.

### Bước 4: Commit

Commit:

~~~text
apps/backend/prisma/schema.prisma
apps/backend/prisma/migrations/0_init/migration.sql
~~~

Không commit .env hay generated/prisma.

## 6. Chia database trong team

Không nên để cả team dùng một database dev. Mỗi dev dùng một database riêng, nhưng tất cả dùng cùng migration từ Git.

~~~text
MySQL server
|- asset_dev_hoant       <- database dev của Hoant
|- asset_dev_an          <- database dev của An
|- asset_test            <- chỉ cho automated/integration tests
|- asset_staging         <- QA test trước release
|- asset_production      <- dữ liệu người dùng thật
~~~

| Môi trường | Có dữ liệu quan trọng? | Ai sửa schema? | Lệnh |
| --- | --- | --- | --- |
| Dev của mỗi người | Không nên quan trọng | Từng dev | migrate dev |
| Test | Không, có thể tạo lại | Test/CI | migrate reset hoặc migrate deploy trên DB trống |
| Staging | Có | CI/CD | migrate deploy |
| Production | Rất quan trọng | CI/CD sau review/backup | migrate deploy |

Nếu A và B dùng chung database dev: A thêm cột, B chưa pull code của A; database chung đã khác nhánh code của B. Prisma có thể phát hiện drift và hỏi reset. Reset có thể xóa dữ liệu test của A. Database dev riêng tránh xung đột này.

### Cách một dev mới tạo database dev riêng

Sau khi baseline đã được commit, dev mới không cần copy database của bạn. Họ tạo một database trống trên MySQL server, qua MySQL Workbench hoặc người quản trị DB:

~~~sql
CREATE DATABASE asset_dev_an
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
~~~

Sau đó dev này đặt DATABASE_URL và DB_NAME trong .env thành asset_dev_an, pull code, rồi chạy:

~~~powershell
cd apps/backend
npx prisma migrate deploy --config prisma.config.ts
npx prisma generate --config prisma.config.ts
~~~

migrate deploy chạy 0_init và các migration đã commit để tạo cấu trúc bảng trên database trống. Nó không copy dữ liệu dev của người khác. Dữ liệu mẫu, nếu cần, phải được seed bằng script riêng.

Về sau, khi dev này tự tạo thay đổi schema, họ dùng migrate dev trên database asset_dev_an của chính họ.

Lưu ý: migrate dev cần shadow database để Prisma kiểm tra schema drift. Tài khoản MySQL local thường cần quyền CREATE DATABASE, hoặc team cần cấu hình một shadow database riêng. Nếu lệnh báo lỗi thiếu quyền tạo shadow database, đừng chạy reset; hỏi người quản trị MySQL cấp quyền phù hợp hoặc cấu hình shadow database.

## 7. Quy trình hằng ngày: thêm cột

Ví dụ cần thêm cột description vào bảng products.

### Bước 1: Lấy thay đổi của team

~~~powershell
git pull
cd apps/backend
npx prisma migrate dev --config prisma.config.ts
npx prisma generate --config prisma.config.ts
~~~

Lệnh này áp migration của đồng đội vào database dev của bạn, không áp vào production.

### Bước 2: Sửa schema

Thêm field vào model:

~~~prisma
model products {
  id          Int     @id @default(autoincrement())
  name        String  @db.VarChar(100)
  description String? @db.Text
}
~~~

Dấu ? nghĩa là cột cho phép NULL. Khi bảng đã có dữ liệu, thêm cột optional trước thường an toàn hơn.

### Bước 3: Tạo và áp migration trên database dev riêng

~~~powershell
npx prisma migrate dev --name add_product_description --config prisma.config.ts
npx prisma generate --config prisma.config.ts
~~~

Kết quả:

1. Prisma tạo thư mục như prisma/migrations/20260714103000_add_product_description/.
2. File migration.sql chứa SQL thêm cột.
3. SQL đó chạy trên database trong DATABASE_URL của bạn.
4. Prisma ghi migration vào _prisma_migrations.

### Bước 4: Sửa code và kiểm tra

Sau generate, Prisma Client mới biết field description. Sửa service/repository cần thiết, sau đó chạy:

~~~powershell
npm run typecheck
~~~

typecheck chỉ kiểm tra TypeScript; nó không sửa database và không chạy server.

### Bước 5: Commit

Commit cùng nhau:

~~~text
prisma/schema.prisma
prisma/migrations/<timestamp>_add_product_description/migration.sql
source code sử dụng description
test liên quan
~~~

Không sửa hay xóa migration đã merge/deploy. Cần sửa thì tạo migration mới.

## 8. Quy trình thêm bảng và quan hệ

Ví dụ thêm categories, mỗi product có thể thuộc một category:

~~~prisma
model categories {
  id       Int        @id @default(autoincrement())
  name     String     @unique @db.VarChar(100)
  products products[]
}

model products {
  id          Int         @id @default(autoincrement())
  name        String      @db.VarChar(100)
  category_id Int?
  category    categories? @relation(fields: [category_id], references: [id])

  @@index([category_id])
}
~~~

Tạo migration:

~~~powershell
npx prisma migrate dev --name add_categories --config prisma.config.ts
npx prisma generate --config prisma.config.ts
~~~

Prisma tạo bảng, cột, index và foreign key. Luôn mở migration.sql xem trước khi commit, đặc biệt khi xóa cột/bảng, đổi tên cột, đổi type cột, hoặc thêm cột bắt buộc.

## 9. Deploy staging và production

Sau khi migration đã được review và merge, CI/CD chạy:

~~~powershell
cd apps/backend
npx prisma migrate deploy --config prisma.config.ts
npx prisma generate --config prisma.config.ts
~~~

migrate deploy:

- Chỉ áp file migration mới chưa có trong _prisma_migrations.
- Không tự tạo migration.
- Không reset database.

Không dùng migrate dev, migrate reset hay db push trên staging/production.

## 10. Test dùng database nào?

| Loại test | Có dùng database? | Dùng database nào? |
| --- | --- | --- |
| Unit test | Thường không, mock repository/Prisma | Không cần DB |
| Integration/API test | Có | asset_test, không phải dev/staging/prod |

Integration test có thể reset asset_test, áp migration, seed dữ liệu test rồi test. Trước migrate reset, luôn kiểm tra lại DATABASE_URL; lệnh này phá dữ liệu.

## 11. Các điều không được làm

1. Không chạy migrate dev trên production/staging.
2. Không chạy migrate reset trên database có dữ liệu cần giữ.
3. Không dùng db push thay cho migration trong team; nó sửa DB mà không tạo lịch sử để đồng đội áp lại.
4. Không sửa bảng bằng MySQL GUI rồi bỏ qua migration. Nếu sửa khẩn cấp, phải tạo migration phản ánh đúng thay đổi đó.
5. Không sửa/xóa migration đã merge hoặc đã deploy.
6. Không commit .env, password, hay Prisma Client đã generate.

## 12. FAQ 4W + 1H

### What - Migration là gì?

Là file SQL ghi lại một bước thay đổi cấu trúc database: thêm bảng, thêm cột, index, foreign key. Migration không phải dữ liệu trong bảng.

### Why - Tại sao cần migration?

Để code của A, B, staging và production dùng cùng cấu trúc database. Migration nằm trong Git, review được và chạy đúng thứ tự. Sửa MySQL bằng GUI chỉ sửa một database và làm các nơi khác bị lệch.

### Who - Ai chạy lệnh nào?

| Người/hệ thống | Lệnh |
| --- | --- |
| Dev tạo thay đổi schema | migrate dev --name ..., sau đó generate |
| Dev pull code của đồng đội | migrate dev, sau đó generate |
| CI/CD deploy staging/production | migrate deploy, sau đó generate |
| Người khởi tạo lịch sử cho DB hiện có | migrate resolve --applied 0_init |

### When - Khi nào dùng từng lệnh?

| Lúc nào | Lệnh |
| --- | --- |
| Database có sẵn, schema Prisma cũ | db pull |
| Thêm/sửa model local | migrate dev --name <mô-tả> |
| Schema vừa đổi | generate |
| Deploy migration đã commit | migrate deploy |
| DB test có thể xóa và cần làm sạch | migrate reset |

### Where - Lệnh tác động vào đâu?

Prisma chọn database bằng DATABASE_URL trong .env, theo [apps/backend/prisma.config.ts](../apps/backend/prisma.config.ts). Prisma không tự biết đó là dev hay production. Vì vậy kiểm tra tên DB trong URL trước mọi lệnh có thể sửa database.

### How - Cách nhớ ngắn nhất

~~~text
Lần đầu với DB đã tồn tại:
db pull -> tạo 0_init -> migrate resolve --applied 0_init -> commit

Mỗi thay đổi mới:
sửa schema.prisma -> migrate dev --name ... -> generate -> sửa code/test -> commit

Deploy:
pull code -> migrate deploy -> generate -> chạy app
~~~

## 13. Checklist trước lệnh có thể sửa database

- [ ] Đang ở thư mục apps/backend.
- [ ] DATABASE_URL trỏ đúng database mong muốn.
- [ ] Database này là dev riêng, test, staging hay production?
- [ ] Staging/production chỉ dùng migrate deploy.
- [ ] Đã review migration.sql nếu thay đổi nguy hiểm.
- [ ] Đã backup nếu database có dữ liệu cần giữ.

## Nguồn tham khảo

- [Prisma: Baselining an existing database](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)
- [Prisma CLI: migrate dev, deploy, reset](https://www.prisma.io/docs/orm/reference/prisma-cli-reference)
