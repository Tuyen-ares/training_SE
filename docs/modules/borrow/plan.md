# Plan — Borrowing

> Input: [`spec.md`](spec.md). Trạng thái hiện tại: plan cho module chưa implement.
> Các câu hỏi mở trong spec phải được chốt trước task làm thay đổi enum/API.

## 1. Phạm vi đợt đầu

- Tạo đơn gồm nhiều asset và giữ asset ngay khi đơn `pending`.
- Danh sách/chi tiết đơn của chính user và danh sách quản trị.
- Duyệt hoặc từ chối toàn bộ đơn.
- Tạo borrow histories khi duyệt.
- Ghi nhận trả từng asset với condition `good|damaged`.
- Phát domain event sau commit khi Event Bus sẵn sàng.

## 2. Kiến trúc và ownership

```text
Borrow routes → BorrowController → BorrowService
                                  ├─ IBorrowRepository
                                  ├─ IBorrowHistoryRepository
                                  ├─ AssetService
                                  ├─ User query boundary
                                  └─ PrismaClient.$transaction
```

- Borrow repository chỉ ghi các bảng Borrow.
- Chỉ AssetService thay đổi `assets.status`.
- BorrowService mở Prisma interactive transaction và truyền cùng `tx` cho tất cả
  repository/service tham gia.
- Không xây UnitOfWork riêng ở giai đoạn này.

## 3. API contract đề xuất

Các URL dưới đây phải được review trước khi khóa controller:

| Method | Endpoint | Permission | Mục đích |
|---|---|---|---|
| POST | `/api/borrow-requests` | `borrow_request.create` | Tạo đơn + reserve |
| GET | `/api/borrow-requests/mine` | `borrow_request.view_own` | Đơn của tôi |
| GET | `/api/borrow-requests` | `borrow_request.view_all` | Tất cả đơn |
| GET | `/api/borrow-requests/:id` | own/all theo ownership | Chi tiết |
| PATCH | `/api/borrow-requests/:id` | `update_own` + owner + pending | Sửa đơn pending |
| POST | `/api/borrow-requests/:id/approve` | `borrow_request.approve` | Duyệt toàn bộ |
| POST | `/api/borrow-requests/:id/reject` | `borrow_request.reject` | Từ chối |
| POST | `/api/borrow-histories/:id/return` | `asset.checkin` | Trả một asset |

Không dùng một endpoint update status chung. Approve/reject/return là domain actions.

## 4. DTO và response

- Create input: danh sách item `{ assetId, expectedReturnDate }`.
- Reject input: `{ note }` nếu chốt note bắt buộc.
- Return input: `{ condition: 'good' | 'damaged' }`.
- Response không trả password/token hoặc internal Prisma shape.
- User chỉ thấy đơn/lịch sử của mình nếu không có `view_all`.

## 5. Data và migration

Schema hiện có `borrow_requests`, `borrow_request_details`, `borrow_histories`.
Trước implement cần review:

- Unique một asset trong một request.
- Index theo `user_id`, `status`, `created_at`.
- `expected_return_date` nằm trên detail.
- Enum hiện chỉ `pending|approved|rejected`.
- Nếu hỗ trợ cancel phải thêm `cancelled` và migration trước khi code/UI.
- Xác định field note cho reject và ai được ghi.

## 6. Transaction flows

### Create + reserve

1. Validate input không rỗng, không duplicate asset, date hợp lệ.
2. Mở transaction.
3. `AssetService.reserve(assetIds, tx)` chạy conditional
   `available → reserved`.
4. Tạo request pending + details.
5. Commit; sau đó publish `borrow_request.created`.
6. Bất kỳ asset nào không available → rollback toàn bộ.

### Approve

1. Conditional update request `pending → approved`.
2. Lấy/khóa tập detail cần xử lý.
3. `AssetService.markBorrowed(assetIds, tx)`.
4. Tạo histories cho toàn bộ details.
5. Commit rồi publish approved event.

### Reject

1. Conditional update `pending → rejected`.
2. Ghi approver/time/note.
3. `AssetService.releaseReservation(assetIds, tx)`.
4. Commit rồi publish rejected event.

### Return

1. Đảm bảo history chưa có `return_date`.
2. Set `return_date`.
3. `AssetService.returnAsset(assetId, condition, tx)`.
4. Commit rồi publish returned event.

## 7. Concurrency và errors

- Hai user reserve cùng asset: update có điều kiện chỉ cho một transaction thành công.
- Hai admin duyệt/từ chối cùng request: conditional `status=pending` chỉ một thành công.
- Hai lần return cùng history: conditional `return_date IS NULL`.
- Conflict không được biến thành 500 hay tạo dữ liệu một phần.
- Ownership violation trả 404 hoặc 403 theo security contract đã chốt.

## 8. Test strategy

- Unit: DTO, ownership, transition, mapping event.
- Integration DB:
  - create/reserve rollback;
  - two-user reserve concurrency;
  - approve all-or-nothing;
  - approve-vs-reject concurrency;
  - duplicate return.
- HTTP: permission own/all/approve/reject/checkin.
- E2E/manual: staff create → manager approve → manager return.

## 9. Thứ tự triển khai

1. Chốt bốn câu hỏi mở trong spec.
2. Review schema/index/enum và tạo migration nếu cần.
3. Models/DTO + validation.
4. Repository contracts và Prisma implementations.
5. Create/reserve vertical slice + concurrency test.
6. Query own/all/detail.
7. Approve/reject + histories.
8. Return flow.
9. Controller/routes/permissions.
10. Event publish sau commit.
11. Frontend staff/manager flows.

## 10. Không làm

- Không update `assets.status` trực tiếp từ BorrowRepository.
- Không approve từng asset riêng trong một request.
- Không cho nhiều pending request giữ cùng asset.
- Không gửi notification/email bên trong transaction.
- Không thêm overdue scheduler, borrow limit hoặc cancel trước khi spec chốt.
- Không dùng generic CRUD update để thay thế domain actions.
