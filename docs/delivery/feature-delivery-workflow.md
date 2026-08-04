# Feature Delivery Workflow

Tài liệu này là playbook triển khai MVP theo **User Story**. Mục tiêu là giữ
requirement, contract, code và test nhất quán mà không cần duy trì tài liệu theo
module.

## 1. Nguồn sự thật

| Nội dung | Nguồn chính | Khi cập nhật |
| --- | --- | --- |
| Nghiệp vụ, Business Rule, Functional Requirement, Acceptance Criteria | `docs/mvp-requirements/` | Khi thay đổi hành vi, state, permission hoặc phạm vi MVP |
| User flow, screen, UI state | `docs/frontend-spec/` | Khi thay đổi flow, screen, navigation, loading/empty/error/action state |
| API và dữ liệu cho một story | Contract của story trong PR/issue hoặc `docs/contracts/` khi contract lớn | Trước khi BE và FE tích hợp |
| Hiện trạng chạy thật | Code, migration và automated tests | Trong cùng thay đổi triển khai |

Không dùng mockup, code cũ hoặc tài liệu module cũ làm nguồn requirement. Khi chúng
mâu thuẫn với hai spec chính, hai spec chính thắng.

## 2. Vòng đời một User Story

Mỗi User Story đi trọn vòng đời trước khi chuyển sang story phụ thuộc tiếp theo.

```text
Chọn User Story
  -> đọc AC + Business Rules + frontend flow/screen
  -> chốt contract tối thiểu
  -> migration/model nếu cần
  -> API/service/authorization
  -> nối view và action FE
  -> test theo Acceptance Criteria
  -> cập nhật contract/spec khi có thay đổi hợp lệ
  -> verified
```

### 2.1 Trước khi code

1. Chọn một User Story có dependency đã sẵn sàng.
2. Đọc toàn bộ Acceptance Criteria, Business Rule được link và flow/screen liên quan.
3. So sánh với mockup. Mockup chỉ quyết định cách hiển thị; không được suy diễn rule
   hoặc state transition mới từ mockup.
4. Chốt contract của story. Không cần chốt API toàn hệ thống trước.
5. Nếu contract làm đổi schema, tạo migration trong cùng scope trước khi viết action.

### 2.2 Contract tối thiểu cho một story

Contract phải trả lời được các câu hỏi sau:

- Endpoint, method, request DTO và response DTO.
- Permission và ownership scope.
- Query: filter, sort, pagination và dữ liệu tối thiểu để render screen.
- Command: state nguồn, state đích, transaction và side effect.
- Validation, HTTP status và error code/message FE cần xử lý.
- Migration/seed/reference data cần có.
- Acceptance Criteria nào được test bằng unit, integration hoặc E2E/manual check.

Ví dụ với `US-F04-02`:

```text
POST /api/borrow-request-details/:id/approve
Permission: <code đã chốt trong registry>
Precondition: detail PENDING, asset AVAILABLE
Atomic result: detail APPROVED; asset RESERVED; lưu reviewer và thời điểm
Conflict: asset không AVAILABLE hoặc detail không PENDING -> 409, không ghi một phần
Evidence: AC-US-F04-02-01..05
```

### 2.3 Thứ tự BE, FE view và action

- Mock/screen skeleton có thể làm sớm để rà UX, vì mockup đã có.
- Trước khi FE gọi thật, contract phải được chốt.
- Với story **xem dữ liệu**, làm query API + response DTO trước, rồi nối list/detail,
  loading, empty, error và permission state.
- Với story **thay đổi dữ liệu**, làm migration/model + transaction/service + HTTP
  integration trước, rồi nối form/action/feedback FE.
- Không chờ hoàn thành mọi endpoint mới nối FE. Hoàn thành một vertical slice có API
  thật sẽ giảm sai lệch contract.

## 3. Quy tắc giữ spec sống

| Loại thay đổi | Phải cập nhật |
| --- | --- |
| Refactor nội bộ, không đổi behavior/DTO | Code và test |
| Đổi DTO, endpoint, error hoặc query behavior | Contract + code/client/test |
| Đổi Business Rule, AC, state transition, permission hoặc scope | `mvp-requirements` trước; `frontend-spec` nếu flow/screen bị ảnh hưởng; rồi contract/code/test |
| Thêm/sửa schema | Migration, contract và các spec bị ảnh hưởng |

- Không copy User Story hoặc Business Rule sang nhiều nơi; contract chỉ link ID nguồn.
- Test nên ghi tên hoặc comment theo AC, ví dụ `AC-US-F04-02-03 rejects unavailable asset`.
- Nếu phát hiện requirement chưa đủ rõ, ghi decision vào `mvp-requirements` trước khi
  code. Không để code tự trở thành quyết định nghiệp vụ.
- Chỉ đánh dấu story `verified` khi toàn bộ AC có bằng chứng test hoặc checklist manual
  rõ ràng.

## 4. Thứ tự triển khai MVP

Thứ tự này theo dependency và tạo được demo chạy thật sớm; không phải thứ tự số
feature cứng nhắc.

### Wave 0 — Nền tảng

1. Xác nhận schema baseline khớp User Story, đặc biệt Borrow, Asset Issue, avatar và
   asset image.
2. Chốt permission registry theo hành vi MVP; không giữ tên legacy chỉ vì code cũ.
3. Verify F01: login, refresh, logout và permission middleware.
4. F08: quản lý user, active/inactive và gán/gỡ role để có tài khoản test đúng quyền.
5. Chuẩn bị department/catalog seed tối thiểu cho Asset. Department CRUD không tự trở
   thành feature UI nếu chưa có User Story/screen yêu cầu.

### Wave 1 — Asset foundation (F02)

1. `US-F02-06`: catalog/reference data cần để tạo asset.
2. `US-F02-04`, `US-F02-05`: tạo và cập nhật asset, gồm department/image/QR/serial.
3. `US-F02-01`, `US-F02-02`, `US-F02-03`: list, detail và selection mode chỉ lấy
   asset `AVAILABLE`.
4. `US-F02-07`: retire theo state hợp lệ.
5. `US-F02-08`: lookup QR mở đúng Asset Detail.

### Wave 2 — Vòng đời mượn (F03 → F04 → F05)

1. F03: tạo request, xem danh sách/chi tiết của mình, thu hồi hợp lệ.
2. F04: approve/reject **từng detail**, rồi Approve All partial success.
3. F05: handover, current borrowed assets, return và history.

Không reserve lúc tạo request. Chỉ approve detail mới chuyển asset
`AVAILABLE -> RESERVED`; handover mới chuyển `RESERVED -> BORROWED` và tạo history.

### Wave 3 — Asset Issue & Repair (F06)

1. Report issue và xem list/detail.
2. Confirm/reject issue.
3. Start/update/close repair từ issue đã xác nhận.
4. Tích hợp return damaged: tạo issue `CONFIRMED` cùng transaction hoàn trả.

### Wave 4 — Notifications (F07)

1. Chốt event-recipient-reference matrix từ các event đã ổn định ở F03–F06.
2. In-app notification API: list, unread count, mark read/read all.
3. Notification Center/badge và navigation đến entity có kiểm permission.

Email, outbox, scheduler và analytics không thuộc MVP nếu requirement chưa mở rộng.

## 5. Definition of Done cho một story

- [ ] Tất cả AC và Business Rule liên quan đã được đọc và không còn mâu thuẫn mở.
- [ ] Contract khớp endpoint/API thật, permission và state transition.
- [ ] Migration/seed cần thiết đã được review và chạy được.
- [ ] BE xử lý validation, ownership, concurrency/transaction khi có command.
- [ ] FE có loading, empty, error, forbidden và action state theo flow.
- [ ] Có test hoặc manual evidence cho mọi AC; AC quan trọng về state/concurrency có
      automated test.
- [ ] Nếu behavior thay đổi, hai spec chính đã được cập nhật trong cùng thay đổi.

