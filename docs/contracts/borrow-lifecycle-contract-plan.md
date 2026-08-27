# Borrow Lifecycle — Planned Contract Map

> Status: superseded by the approved and implemented contract in
> [`borrow-lifecycle.md`](borrow-lifecycle.md). Retained as planning history.
>
> Scope: the Release 1 borrow lifecycle: F03, F04 and the normal-return
> portion of F05.

## What a contract means here

A contract is the agreement at a system boundary: API routes, input/output
DTOs, authorization, validation, error responses and state changes. It is not
the same thing as one function.

- One contract may cover several closely related endpoints and services.
- One endpoint may call several internal functions.
- Internal functions do not need a public API contract unless they cross a
  boundary used by another module.

## Planned contract boundaries

| Planned contract file | Module | User stories covered in this delivery | Expected API boundary |
| --- | --- | --- | --- |
| `borrow-request.md` | F03 — Borrow Request | `US-F03-01`, `US-F03-02`, `US-F03-03` | Create a request; list the current user's requests; read the current user's request detail. |
| `approval-reservation.md` | F04 — Approval & Reservation | `US-F04-01`, `US-F04-02`, `US-F04-03` | Read the review queue; approve one detail and reserve its asset atomically; reject one detail with a reason. |
| `handover-return-history.md` | F05 — Handover, normal Return & History | `US-F05-01`, `US-F05-02`, `US-F05-03` (normal return only), `US-F05-04`, `US-F05-05` | Confirm handover; read current borrows; confirm normal return; read own/all history by permission. |

## Draft API interfaces

> These are proposed public interfaces to be reviewed before implementation.
> They use the project's camelCase API convention and successful responses use
> `{ "data": ... }`. They are deliberately separate from the legacy
> `apps/backend/src/models/borrow-*.model.ts` files, which do not yet model
> the current Prisma schema or approved per-detail workflow.

### Shared DTOs

```ts
type ApiEnvelope<T> = { data: T }

type Page<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

type BorrowRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_APPROVED'
  | 'COMPLETED'
  | 'CANCELLED'

type BorrowDetailApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

type AssetSummary = {
  id: number
  serialNumber: string | null
  qrCode: string
  status: 'AVAILABLE' | 'RESERVED' | 'BORROWED' | 'DAMAGED' | 'IN_REPAIR' | 'RETIRED'
  model: { id: number; name: string }
}

type BorrowRequestDetailDto = {
  id: number
  asset: AssetSummary
  expectedReturnAt: string // ISO-8601; date-vs-datetime remains an open question.
  approvalStatus: BorrowDetailApprovalStatus
  approvedBy: { id: number; name: string } | null
  approvedAt: string | null
  rejectionReason: string | null
  history: BorrowHistoryDto | null
}

type BorrowRequestDto = {
  id: number
  requester: { id: number; name: string }
  status: BorrowRequestStatus
  note: string | null
  createdAt: string
  details: BorrowRequestDetailDto[]
}

type BorrowRequestListItemDto = {
  id: number
  status: BorrowRequestStatus
  createdAt: string
  detailCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
}

type BorrowHistoryDto = {
  id: number
  detailId: number
  asset: AssetSummary
  borrower: { id: number; name: string }
  expectedReturnAt: string
  handedOverBy: { id: number; name: string } | null
  borrowedAt: string
  receivedBy: { id: number; name: string } | null
  returnedAt: string | null
  returnCondition: string | null
}

type ApiError = {
  error: string
  details?: Record<string, string[]>
}
```

**Common error meaning:** `400` invalid path/query/body; `401` unauthenticated;
`403` missing permission or ownership; `404` missing request/detail/history;
`409` valid command but state or concurrency conflict. The final contract must
name the stable error codes/messages before implementation.

### Contract 1 interface — Borrow Request

```ts
// POST /api/borrow-requests
// Requires: borrow_request.create
type CreateBorrowRequestInput = {
  note?: string | null
  items: Array<{
    assetId: number
    expectedReturnAt: string
  }>
}
// 201 ApiEnvelope<BorrowRequestDto>

// GET /api/borrow-requests/me?page=&pageSize=&status=
// Requires: borrow_request.view_own
// 200 ApiEnvelope<Page<BorrowRequestListItemDto>>

// GET /api/borrow-requests/:requestId
// Requires: borrow_request.view_own for the requester, or borrow_request.view_all
// 200 ApiEnvelope<BorrowRequestDto>
```

**State rule at this boundary:** creation writes a request and one `PENDING`
detail per asset; it never reserves or changes an asset from `AVAILABLE`.

### Contract 2 interface — Approval & Reservation

```ts
type ReviewQueueItemDto = BorrowRequestListItemDto & {
  requester: { id: number; name: string }
  details: Array<Pick<
    BorrowRequestDetailDto,
    'id' | 'asset' | 'expectedReturnDate' | 'approvalStatus' | 'rejectionReason'
  >>
}

// GET /api/borrow-request-details/review-queue?page=&pageSize=&approvalStatus=
// approvalStatus: PENDING (default), ALL, APPROVED, REJECTED.
// ALL returns request groups with a PENDING detail first; each group is oldest-first.
// Requires: borrow_request.view_all
// 200 ApiEnvelope<Page<ReviewQueueItemDto>>

// POST /api/borrow-request-details/:detailId/approve
// Requires: borrow_request.approve
// Body: none
// 200 ApiEnvelope<BorrowRequestDetailDto>

// POST /api/borrow-request-details/:detailId/reject
// Requires: borrow_request.reject
type RejectBorrowDetailInput = { rejectionReason: string }
// 200 ApiEnvelope<BorrowRequestDetailDto>
```

**State rule at this boundary:** approve is one atomic transaction:
`detail PENDING + asset AVAILABLE → detail APPROVED + asset RESERVED`.
An unavailable asset or competing successful approval returns `409` and leaves
the target detail `PENDING`. Reject changes only `PENDING → REJECTED` and does
not change the asset's status.

### Contract 3 interface — Handover, normal Return & History

```ts
// POST /api/borrow-request-details/:detailId/handover
// Requires: asset.checkout
type ConfirmHandoverInput = { mediaIds?: number[] }
type ConfirmHandoverResponse = { historyId: number }
// 200 ApiEnvelope<ConfirmHandoverResponse>

// GET /api/borrow-request-details/handover-queue?page=&pageSize=
// Requires: asset.checkout
// 200 ApiEnvelope<Page<HandoverQueueRequestDto>>

// GET /api/borrow-request-details/handover-queue/:requestId
// Requires: asset.checkout
// 200 ApiEnvelope<HandoverQueueRequestDto>

// GET /api/borrow-histories/return-queue/:requestId
// Requires: asset.checkin
// 200 ApiEnvelope<ReturnQueueRequestDto>

// GET /api/borrow-histories/current?page=&pageSize=
// Requires: borrow_history.view_own
// 200 ApiEnvelope<Page<BorrowHistoryDto>>

// POST /api/borrow-histories/:historyId/return
// Requires: asset.checkin
type ConfirmNormalReturnInput = {
  returnCondition: string
}
// 200 ApiEnvelope<BorrowHistoryDto>

// GET /api/borrow-histories/me?page=&pageSize=
// Requires: borrow_history.view_own
// 200 ApiEnvelope<Page<BorrowHistoryDto>>

// GET /api/borrow-histories?page=&pageSize=&requesterId=&assetId=
// Requires: borrow_history.view_all
// 200 ApiEnvelope<Page<BorrowHistoryDto>>
```

**State rule at this boundary:** handover is one transaction:
`detail APPROVED + asset RESERVED → asset BORROWED + one history`. A normal
return is one transaction: `asset BORROWED + unreturned history → history
returned + asset AVAILABLE`; it may also derive the request header as
`COMPLETED`. The damaged-return branch is excluded from this interface.

### Open decisions that must be approved before these become real contracts

1. Is `expectedReturnAt` a date-only value or a datetime, and which timezone
   validates it?
2. What are the maximum lengths and permitted values for request note,
   rejection reason and `returnCondition`?
3. What pagination defaults, maximum page size, filters and sort order apply
   to request, review-queue and history lists?
4. Does `borrow_request.view_all` / review-queue visibility mean company-wide
   scope in Release 1, or is there a department scope?

## Explicitly outside this delivery

| User story | Reason |
| --- | --- |
| `US-F03-04` — Withdraw request | Deferred by the current Release 1 slice. |
| `US-F04-04` — Approve all with partial success | Deferred by the current Release 1 slice. |
| `AC-US-F05-03-06` — Return as damaged and create a confirmed issue | Deferred branch. It needs an Asset Issue contract that joins return and issue creation. |

---

## Contract 1 — Borrow Request (`borrow-request.md`)

### US-F03-01 — Create a borrow request

**User Story**

Là một **nhân viên**,  
tôi muốn **tạo phiếu yêu cầu một hoặc nhiều asset**,  
để **đề nghị cấp thiết bị phục vụ công việc**.

**Acceptance Criteria**

- `AC-US-F03-01-01`: Given đã chọn ít nhất một asset `AVAILABLE` và ngày trả dự kiến hợp lệ, when gửi phiếu, then hệ thống tạo một request cùng các detail `PENDING`.
- `AC-US-F03-01-02`: Then asset vẫn `AVAILABLE` cho tới khi một detail được duyệt.
- `AC-US-F03-01-03`: Given cùng asset xuất hiện nhiều lần trong phiếu, then hệ thống từ chối.
- `AC-US-F03-01-04`: Given asset không tồn tại hoặc không còn `AVAILABLE` lúc gửi, then hệ thống từ chối detail/phiếu theo validation được hiển thị và không tạo dữ liệu sai.
- `AC-US-F03-01-05`: Given nhiều nhân viên cùng tạo request `PENDING` cho một asset `AVAILABLE`, then các request đều có thể được ghi nhận.

**Functional Requirements**

- `FR-F03-01`: Hệ thống phải cho phép nhân viên tạo phiếu gồm một hoặc nhiều asset `AVAILABLE`.
- `FR-F03-02`: Hệ thống phải kiểm tra asset tồn tại, không trùng trong phiếu và ngày trả dự kiến hợp lệ.

### US-F03-02 — View my borrow requests

**User Story**

Là một **nhân viên**,  
tôi muốn **xem các phiếu do mình tạo**,  
để **theo dõi tiến độ nhu cầu mượn**.

**Acceptance Criteria**

- `AC-US-F03-02-01`: When mở danh sách của tôi, then chỉ các phiếu do user hiện tại tạo được hiển thị.
- `AC-US-F03-02-02`: Then mỗi phiếu hiển thị tối thiểu mã, ngày tạo và trạng thái tổng.
- `AC-US-F03-02-03`: Given user cố xem danh sách riêng của người khác mà không có permission, then hệ thống từ chối.
- `AC-US-F03-02-04`: Danh sách phản ánh trạng thái tổng mới nhất theo các detail.

**Functional Requirements**

- `FR-F03-03`: Hệ thống phải cho phép nhân viên xem danh sách phiếu do mình tạo.
- `FR-F04-05`: Hệ thống phải suy ra trạng thái tổng của phiếu từ các detail và lịch sử hoàn trả theo BR.

### US-F03-03 — View my borrow request detail

**User Story**

Là một **nhân viên**,  
tôi muốn **xem trạng thái từng asset trong phiếu của mình**,  
để **biết asset nào đang chờ, được duyệt hay bị từ chối**.

**Acceptance Criteria**

- `AC-US-F03-03-01`: Given phiếu thuộc user hiện tại, when mở chi tiết, then hệ thống hiển thị header và toàn bộ detail.
- `AC-US-F03-03-02`: Then mỗi detail hiển thị asset, ngày trả dự kiến, approval status và lý do từ chối khi có.
- `AC-US-F03-03-03`: Then trạng thái duyệt chỉ là `PENDING`, `APPROVED` hoặc `REJECTED`.
- `AC-US-F03-03-04`: Given phiếu không thuộc user và user thiếu permission xem toàn bộ, then hệ thống từ chối.

**Functional Requirements**

- `FR-F03-04`: Hệ thống phải cho phép nhân viên xem chi tiết và trạng thái từng asset trong phiếu của mình.

---

## Contract 2 — Approval & Reservation (`approval-reservation.md`)

### US-F04-01 — View the review queue

**User Story**

Là một **user có quyền xử lý yêu cầu mượn**,  
tôi muốn **xem các phiếu và detail cần xem xét**,  
để **thực hiện duyệt hoặc từ chối đúng đối tượng**.

**Acceptance Criteria**

- `AC-US-F04-01-01`: Given có permission, when mở danh sách, then hệ thống hiển thị các phiếu thuộc phạm vi được phép.
- `AC-US-F04-01-02`: Then hệ thống thể hiện trạng thái tổng và trạng thái từng detail.
- `AC-US-F04-01-03`: Then user có thể nhận biết detail nào còn `PENDING`.
- `AC-US-F04-01-04`: Given thiếu permission xem toàn bộ, then hệ thống không cung cấp dữ liệu của người khác.

**Functional Requirements**

- `FR-F04-01`: Hệ thống phải cho phép user có quyền xem các phiếu và detail cần xử lý.

### US-F04-02 — Approve one detail and reserve the asset

**User Story**

Là một **user có quyền duyệt**,  
tôi muốn **duyệt một asset đang chờ trong phiếu**,  
để **giữ thiết bị đó cho người yêu cầu trước khi bàn giao**.

**Acceptance Criteria**

- `AC-US-F04-02-01`: Given detail `PENDING` và asset `AVAILABLE`, when duyệt, then detail thành `APPROVED` và asset thành `RESERVED`.
- `AC-US-F04-02-02`: Then hệ thống ghi người và thời điểm xử lý detail.
- `AC-US-F04-02-03`: Given asset không còn `AVAILABLE`, when duyệt, then hệ thống báo xung đột và detail vẫn `PENDING`.
- `AC-US-F04-02-04`: Given hai người đồng thời duyệt các detail giữ cùng asset, then chỉ một thao tác thành công.
- `AC-US-F04-02-05`: Given bất kỳ phần nào của thao tác thất bại, then detail và asset đều giữ trạng thái trước thao tác.

**Functional Requirements**

- `FR-F04-02`: Hệ thống phải cho phép duyệt một detail `PENDING` khi asset còn `AVAILABLE`.
- `FR-F04-05`: Hệ thống phải suy ra trạng thái tổng của phiếu từ các detail và lịch sử hoàn trả theo BR.
- `FR-F04-06`: Hệ thống phải ngăn hai thao tác đồng thời cùng duyệt giữ một asset.

### US-F04-03 — Reject one detail

**User Story**

Là một **user có quyền từ chối**,  
tôi muốn **từ chối một asset đang chờ và ghi lý do**,  
để **người yêu cầu hiểu quyết định xử lý**.

**Acceptance Criteria**

- `AC-US-F04-03-01`: Given detail `PENDING`, when từ chối với lý do hợp lệ, then detail thành `REJECTED`.
- `AC-US-F04-03-02`: Then hệ thống ghi người, thời điểm và lý do từ chối.
- `AC-US-F04-03-03`: Given thiếu lý do, when từ chối dữ liệu mới, then hệ thống không hoàn tất thao tác.
- `AC-US-F04-03-04`: Given detail không còn `PENDING`, then hệ thống từ chối xử lý lại.
- `AC-US-F04-03-05`: Then asset không bị chuyển status do thao tác từ chối một detail chưa được duyệt.

**Functional Requirements**

- `FR-F04-03`: Hệ thống phải cho phép từ chối một detail `PENDING` và ghi lý do.
- `FR-F04-05`: Hệ thống phải suy ra trạng thái tổng của phiếu từ các detail và lịch sử hoàn trả theo BR.

---

## Contract 3 — Handover, normal Return & History (`handover-return-history.md`)

### US-F05-01 — Confirm handover

**User Story**

Là một **user có quyền bàn giao**,  
tôi muốn **xác nhận đã giao asset được giữ chỗ**,  
để **ghi nhận người mượn đã thực sự nhận thiết bị**.

**Acceptance Criteria**

- `AC-US-F05-01-01`: Given detail `APPROVED` và asset `RESERVED` cho đúng detail, when xác nhận, then asset chuyển `BORROWED`.
- `AC-US-F05-01-02`: Then hệ thống tạo một borrow history ghi người và thời điểm bàn giao.
- `AC-US-F05-01-03`: Given detail đã có borrow history, when xác nhận lại, then hệ thống từ chối tạo lịch sử thứ hai.
- `AC-US-F05-01-04`: Given asset không còn `RESERVED` cho detail, then không có history hoặc status nào bị ghi một phần.
- `AC-US-F05-01-05`: Người mượn được xác định từ request, không yêu cầu nhập lại.

**Functional Requirements**

- `FR-F05-01`: Hệ thống phải cho phép user có quyền xác nhận bàn giao một detail đã duyệt và được giữ chỗ.
- `FR-F05-02`: Hệ thống phải tạo lịch sử bàn giao duy nhất cho detail và ghi người/thời điểm bàn giao.

### US-F05-02 — View my currently borrowed assets

**User Story**

Là một **nhân viên**,  
tôi muốn **xem các asset hiện đang được bàn giao cho mình**,  
để **biết trách nhiệm hoàn trả hiện tại**.

**Acceptance Criteria**

- `AC-US-F05-02-01`: When mở danh sách đang mượn, then hệ thống chỉ hiển thị history thuộc request của user hiện tại chưa hoàn trả.
- `AC-US-F05-02-02`: Then mỗi dòng hiển thị asset, ngày bàn giao và ngày trả dự kiến.
- `AC-US-F05-02-03`: Detail chỉ `APPROVED` nhưng chưa có bàn giao không được coi là đang mượn.
- `AC-US-F05-02-04`: Asset đã có return date không còn xuất hiện trong danh sách đang mượn.

**Functional Requirements**

- `FR-F05-03`: Hệ thống phải cho phép nhân viên xem các asset mình đang mượn.

### US-F05-03 — Confirm a normal return

**User Story**

Là một **user có quyền nhận trả**,  
tôi muốn **xác nhận asset được hoàn trả**,  
để **kết thúc lượt mượn và đưa thiết bị về khả dụng**.

**Acceptance Criteria in this contract**

- `AC-US-F05-03-01`: Given asset `BORROWED` có history chưa trả, when xác nhận trả bình thường, then ghi người nhận, thời điểm và tình trạng trả.
- `AC-US-F05-03-02`: Then asset chuyển `BORROWED → AVAILABLE`.
- `AC-US-F05-03-03`: Given history đã có return date, when xác nhận lại, then hệ thống từ chối.
- `AC-US-F05-03-04`: Given lỗi ở bất kỳ cập nhật nào, then history và asset không bị lưu trạng thái một phần.
- `AC-US-F05-03-05`: Khi mọi lượt được duyệt/bàn giao trong phiếu đã trả, header chuyển `COMPLETED`.

**Deferred Acceptance Criterion**

- `AC-US-F05-03-06`: Given người nhận xác nhận tình trạng `DAMAGED`, when hoàn trả, then history ghi `return_date` và `return_condition = DAMAGED`, issue `CONFIRMED` được tạo và asset chuyển `BORROWED → DAMAGED`. This is intentionally deferred to the return-and-issue contract.

**Functional Requirements**

- `FR-F05-04`: Hệ thống phải cho phép user có quyền xác nhận hoàn trả bình thường và ghi tình trạng trả.
- `FR-F04-05`: Hệ thống phải suy ra trạng thái tổng của phiếu từ các detail và lịch sử hoàn trả theo BR.

### US-F05-04 — View my borrow history

**User Story**

Là một **nhân viên**,  
tôi muốn **xem lịch sử các asset mình đã mượn và trả**,  
để **đối chiếu quá trình sử dụng thiết bị của bản thân**.

**Acceptance Criteria**

- `AC-US-F05-04-01`: When mở lịch sử của tôi, then chỉ các history truy về request của user hiện tại được hiển thị.
- `AC-US-F05-04-02`: Then mỗi history thể hiện asset, ngày bàn giao, ngày trả và tình trạng trả khi có.
- `AC-US-F05-04-03`: History chưa trả được phân biệt rõ với history đã hoàn trả.
- `AC-US-F05-04-04`: User không thể đổi dữ liệu history từ chức năng xem.

**Functional Requirements**

- `FR-F05-05`: Hệ thống phải cho phép xem lịch sử mượn của bản thân hoặc toàn bộ theo permission.

### US-F05-05 — View all borrow history

**User Story**

Là một **user có quyền xem toàn bộ lịch sử**,  
tôi muốn **tra cứu lịch sử mượn/trả trong phạm vi được cấp**,  
để **hỗ trợ quản lý và đối chiếu tài sản**.

**Acceptance Criteria**

- `AC-US-F05-05-01`: Given có permission, when mở lịch sử, then hệ thống hiển thị các bản ghi thuộc phạm vi được phép.
- `AC-US-F05-05-02`: Then có thể nhận biết người mượn qua phiếu, người bàn giao và người nhận trả.
- `AC-US-F05-05-03`: Given thiếu permission xem toàn bộ, then user không truy cập được lịch sử của người khác.
- `AC-US-F05-05-04`: Dữ liệu hiển thị phản ánh history đã ghi, không suy ra bàn giao chỉ từ approval status.

**Functional Requirements**

- `FR-F05-05`: Hệ thống phải cho phép xem lịch sử mượn của bản thân hoặc toàn bộ theo permission.

## Sources

- `docs/mvp-requirements/06-features/F03-borrow-request.md`
- `docs/mvp-requirements/06-features/F04-approval-reservation.md`
- `docs/mvp-requirements/06-features/F05-handover-return.md`
- `docs/mvp-requirements/05-functional-requirements.md`
- `docs/mvp-requirements/07-user-stories/borrow-request/`
- `docs/mvp-requirements/07-user-stories/approval-reservation/`
- `docs/mvp-requirements/07-user-stories/handover-return/`
