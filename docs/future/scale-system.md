# BigIn — Scale System Design

**Status: FUTURE / NOT IMPLEMENTED**

Tài liệu này là thiết kế ứng viên cho giai đoạn sau MVP F01–F08. Không có nội dung
nào trong đây được xem là behavior hiện tại, schema đã chốt, API contract, permission
hay acceptance criteria của MVP.

Nguồn hiện tại cần đọc trước khi so sánh:

- [MVP context](../mvp-requirements/00-context.md)
- [MVP scope](../mvp-requirements/01-mvp-scope.md)
- [Business rules](../mvp-requirements/04-business-rules.md)
- [F05 Handover & Return](../mvp-requirements/06-features/F05-handover-return.md)
- [F06 Asset Issues & Repair](../mvp-requirements/06-features/F06-asset-issues-repair.md)
- [API contracts](../contracts/)
- [Frontend user flows](../delivery/frontend-spec/03-user-flows/)

## 1. Mục tiêu scale

### Current MVP

MVP quản lý core lifecycle:

```text
Asset
→ Borrow Request
→ Approval
→ Reservation
→ Handover
→ Borrowing
→ Return
→ Issue
→ Repair
```

MVP tập trung vào trạng thái, người thực hiện, thời gian và quyền truy cập cơ bản.

### Future target

Hệ thống có thể mở rộng thêm:

- Custody evidence.
- Handover inspection.
- Return inspection.
- Ảnh/video bằng chứng.
- Checklist phụ kiện.
- Electronic acknowledgement.
- Return receipt và handover receipt.
- Damaged-return workflow đầy đủ.
- Repair audit.
- Parts replacement.
- Warranty.
- External repair documents/invoice.
- Post-repair evidence.
- Repair handback và employee acknowledgement.
- Khả năng thêm role IT Support khi tổ chức cần.

Các mục trên chỉ là target candidate. Không được mô tả chúng như chức năng đã có.

## 2. Nguyên tắc kiến trúc khi scale

- Authorization tiếp tục dựa trên **effective permission**, không dựa trên tên role.
- Manager/Admin hiện tại có thể sở hữu capability xử lý IT operations nếu được cấp quyền.
- Sau này có thể thêm IT Support bằng cách assign các permission phù hợp, không rewrite business flow.
- Không hard-code logic kiểu `if role == "IT_SUPPORT"` hoặc `if role == "manager"`.
- Các actor field hiện tại tiếp tục tham chiếu `users`:
  - `reported_by` — người báo issue.
  - `handled_by` — người xử lý issue.
  - `handed_over_by` — người xác nhận bàn giao.
  - `received_by` — người tiếp nhận khi trả.
- Role mới chỉ là cách gom permission; role không phải identity của domain event.
- Mọi mở rộng phải bảo toàn các trạng thái MVP và không làm approval đồng nghĩa với handover.

## 3. Handover — Current vs Future

### Current MVP

```text
APPROVED detail
+ RESERVED asset
→ Handover
→ asset BORROWED
→ tạo borrow_history
→ lưu người bàn giao và thời gian
```

Record hiện tại là `borrow_histories`; thông tin chính gồm `handed_over_by` và
`borrow_date`. Đây là lifecycle record, chưa phải bộ hồ sơ bằng chứng đầy đủ.

### Future candidate

```text
RESERVED
→ Handover Inspection
→ condition lúc giao
→ accessory checklist
→ evidence photos
→ employee acknowledgement
→ BORROWED
```

Future data candidate:

- `condition_out`.
- `handover_note`.
- Accessory checklist.
- Evidence photos/media.
- Employee confirmation.
- `confirmed_by` và `confirmed_at`.
- Receipt/reference nếu business cần.

Evidence candidate:

- Serial hoặc Asset Tag.
- Màn hình đang hoạt động.
- Ngoại hình tổng thể.
- Phụ kiện đi kèm.
- Cận cảnh damage có sẵn trước khi giao.

Đây là candidate để thảo luận, chưa quyết định tên bảng, cột hay API.

## 4. Return — Current vs Future

### Current MVP

```text
BORROWED
→ Return
→ NORMAL
→ history returned
→ AVAILABLE
```

MVP hiện ghi người tiếp nhận, thời gian trả và `return_condition`. Luồng evidence,
phụ kiện và biên bản chưa thuộc phạm vi hiện tại.

### Future inspection flow

```text
BORROWED
→ Return Inspection
→ return reason
→ condition inspection
→ accessory comparison
→ evidence
→ receiver acknowledgement
→ NORMAL hoặc DAMAGED
```

Normal return:

```text
BORROWED
→ return record
→ NORMAL
→ AVAILABLE
```

Damaged return:

```text
BORROWED
→ ghi history returned
→ return_condition = DAMAGED
→ tạo Asset Issue = CONFIRMED
→ asset = DAMAGED
→ chuyển sang repair lifecycle
```

Damaged Return là điểm nối giữa F05 và F06. History update, issue creation và asset
transition phải là một atomic business operation hoặc transaction-safe design.

Không tự thêm status mới chỉ để biểu diễn return inspection; status mới phải được
review và chốt trong requirement riêng.

## 5. Report Issue — Future expansion

### Current MVP

```text
Report Issue
→ description
→ REPORTED
→ asset chưa tự chuyển sang DAMAGED
```

### Future candidate

Có thể bổ sung:

- `severity` hoặc impact level.
- Ảnh evidence.
- Video evidence.
- Optional loaner request.
- Ảnh serial/asset tag.
- Evidence lúc IT intake.

Nguyên tắc không thay đổi:

```text
Report mới
KHÔNG tự động đổi asset sang DAMAGED.

Confirm Issue
→ REPORTED → CONFIRMED
→ asset → DAMAGED
```

## 6. Repair — Current vs Future

### Current MVP

```text
CONFIRMED + DAMAGED
→ Start Repair
→ IN_REPAIR
→ Complete
   → COMPLETED + AVAILABLE
```

Hoặc:

```text
→ Fail
   → FAILED + DAMAGED
```

Repair thất bại không tự chuyển asset sang `RETIRED`.

### Future candidate

- Parts replaced.
- Repair provider.
- Repair cost.
- Invoice hoặc repair document.
- Warranty period và expiration.
- Photos before repair.
- Photos after repair.
- Repair test result.
- Employee acknowledgement sau khi nhận lại asset.

## 7. Repair Handback

Đây là **OPEN DESIGN AREA**, chưa được tự quyết định.

Tình huống cần thiết kế:

```text
Employee đang sử dụng asset
→ asset gặp lỗi
→ IT/Manager/Admin nhận máy sửa
→ Repair Complete
```

Các option cần review:

### Option A

```text
Repair Complete → AVAILABLE
```

### Option B

```text
Repair Complete → giao lại borrower cũ → BORROWED
```

### Option C

```text
Repair Complete
→ WAITING_HANDBACK hoặc workflow tương đương
→ employee xác nhận nhận lại
→ BORROWED
```

Không tự thêm `WAITING_HANDBACK` hoặc status tương đương vào schema hiện tại.
Quyết định được theo dõi tại [open-questions.md](open-questions.md).

## 8. Evidence / Attachment architecture

Không nên thêm các cột lặp kiểu:

```text
handover_image_1
handover_image_2
return_image_1
return_image_2
issue_image_1
```

Future candidate là một evidence/media entity dùng chung, ở mức khái niệm:

```text
id
entity_type
entity_id
evidence_type
file_url
file_name
mime_type
uploaded_by
created_at
```

Có thể gắn evidence vào:

- Handover.
- Return.
- Issue report.
- Repair intake.
- Repair result.
- Receipt/document.

Đây chỉ là conceptual candidate. Không phải schema requirement, không tạo Prisma
model, migration hoặc upload API trong task documentation này.

Khi được chốt, cần quyết định thêm nơi lưu file, quyền xem, retention, kích thước,
mime type, chống thay thế file và cách audit metadata.

## 9. Accessories

Future cần theo dõi phụ kiện lúc bàn giao và trả, nhưng model chưa được chốt.

Hai candidate:

- **Option A — Managed entity:** accessory là entity riêng, có thể có asset tag riêng.
- **Option B — Checklist:** accessory chỉ là checklist của từng handover/return.

Không tự chọn option và không tạo bảng trong task này. Xem câu hỏi tương ứng trong
[`open-questions.md`](open-questions.md).

## 10. Electronic acknowledgement

Không mặc định đây là chữ ký số PKI.

Future có thể bắt đầu đơn giản:

```text
Authenticated user
→ Confirm Received
→ lưu confirmed_by và confirmed_at
```

Nếu business cần, có thể mở rộng sau thành:

- Drawn signature.
- Email confirmation.
- Digital certificate/signature.

Không implement acknowledgement trong MVP hiện tại.

## 11. IT Support role

### Current

Chưa cần role IT Support riêng. Manager/Admin có thể nhận các permission nghiệp vụ
tương ứng.

### Future

Có thể thêm:

```text
IT Support
→ roles
→ permissions
→ business actions
```

Không dùng:

```text
if role == "IT_SUPPORT"
```

Không yêu cầu đổi business schema chỉ vì thêm role.

## 12. Permission model khi scale

- Authorization vẫn capability-based.
- Không hard-code role.
- Một user có thể có nhiều role; effective permissions là union của các role được gán.
- Permission naming hiện tại có thể còn legacy/inconsistent.
- Normalize permission naming là một RBAC migration riêng.
- Không coi permission rename là điều kiện bắt buộc để triển khai evidence/custody scale.
- Nếu chưa chốt naming mới, giữ câu hỏi trong [open-questions.md](open-questions.md).
- Không rename permission trong task documentation này.

## 13. Future schema candidates

Chỉ xem xét sau khi future scope được chốt:

- `handover_records`.
- `return_records`.
- Evidence/media.
- Accessories.
- `handover_accessories`.
- `return_accessories`.
- `repair_parts`.
- `repair_documents`.
- Acknowledgements.

Đây là future candidates, không phải schema requirement. Không tạo table, model hoặc
migration trong task này. Mục tiêu là tránh nhồi toàn bộ future metadata vào
`borrow_histories` hoặc `asset_issues`.

## 14. Phase rollout candidate

### Phase 0 — Current MVP

Hoàn tất và verified F01–F08.

### Phase 1 — Evidence & Custody

- Handover condition.
- Return condition detail.
- Photo/media evidence.
- Electronic acknowledgement.
- Damaged Return hoàn chỉnh.
- Receipt/e-form nếu được chốt.

### Phase 2 — Accessories

- Handover accessory checklist.
- Return accessory comparison.
- Missing accessory handling.

### Phase 3 — Repair Audit

- Repair media.
- Parts replacement.
- Warranty.
- External provider documents.
- Invoice.
- Post-repair evidence.

### Phase 4 — Advanced Custody

- Repair handback.
- Employee acknowledgement.
- Immutable/audit-oriented history nếu business cần.
- IT Support role nếu organization cần.

Mỗi phase phải có requirement, contract, implementation plan và test riêng trước khi
được chuyển sang `VERIFIED`.

## 15. Mapping MVP → Future

| MVP feature | Hướng mở rộng future |
|---|---|
| F01 Auth & Access | Mở rộng role/capability khi tổ chức cần. |
| F02 Asset Management | Evidence identity và lifecycle giàu thông tin hơn. |
| F03 Borrow Request | Có thể thêm request metadata nếu được chốt. |
| F04 Approval & Reservation | Giữ nguyên approval/reservation core. |
| F05 Handover & Return | Custody, evidence, accessories và sign-off. |
| F06 Asset Issues & Repair | Issue media, repair audit và handback. |
| F07 Notifications | Notification cho acknowledgement/evidence workflow. |
| F08 Administration | Quản trị capability và role IT Support nếu cần. |

## 16. Future acceptance candidates

Đây là acceptance candidate cho future, **không phải AC của MVP hiện tại**:

- Có thể chứng minh asset nào được giao cho ai và lúc nào.
- Có evidence tình trạng lúc giao.
- Có evidence tình trạng lúc trả.
- Có thể so sánh phụ kiện giao và trả.
- Damaged Return tạo issue và cập nhật asset nhất quán.
- Có audit trail của repair.
- Có thể xác nhận employee đã nhận lại asset.
- Thêm role mới không yêu cầu rewrite business flow.

Mỗi candidate phải được chuyển thành requirement/AC chính thức trước khi implement.
