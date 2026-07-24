# Implementation — Borrowing

## 1. Trạng thái

**Chưa triển khai.**

## 2. Thành phần đã có

- Prisma schema đã có:
  - `borrow_requests`
  - `borrow_request_details`
  - `borrow_histories`
- Có các model TypeScript cũ/tối thiểu tương ứng.
- AssetService đã có các boundary cần thiết:
  - `reserve`
  - `releaseReservation`
  - `markBorrowed`
  - `returnAsset`
- Permission registry đã có nhóm Borrow và Borrow History.

## 3. Thành phần chưa có

- Borrow/BorrowHistory repository contracts và Prisma implementations.
- BorrowService.
- Controller/routes và route registration.
- DTO/validation chính thức.
- Unit/integration/concurrency tests.
- Frontend flow kết nối API.
- Domain event publish.

## 4. API đang hoạt động

Không có Borrow endpoint nào được đăng ký trong `apps/backend/src/routes/index.ts`.

## 5. Data lưu ý

- Enum request hiện chỉ có `pending|approved|rejected`.
- Asset enum đã có `reserved`.
- Chưa được coi schema Borrow hoàn tất cho tới khi review cancel/note/index.

## 6. Verification hiện tại

Chưa có test Borrow. Các view “Checkouts” ở frontend không phải bằng chứng module
đã được nối với backend.

## 7. Bước implement tiếp theo

Chốt BOR-T01 rồi thực hiện vertical slice BOR-T03 → BOR-T06 trước. Không bắt đầu
approve/notification trước khi create + reserve và concurrency test hoạt động.
