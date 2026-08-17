# Phase 2 — Accessories Checklist

**Status: FUTURE / NOT IMPLEMENTED**
**Phụ thuộc: Phase 0 đã đạt gate; Phase 1 image evidence relation đã ổn định**

## Mục tiêu

Biết asset được giao kèm những gì và lúc trả có thiếu, hỏng hoặc thay đổi gì
không, nhưng chưa biến phụ kiện thành asset có lifecycle riêng.

## Phạm vi

- Khai báo danh sách accessory template dùng cho checklist.
- Chụp snapshot checklist tại thời điểm handover.
- Ghi checklist thực tế tại thời điểm return.
- So sánh giao và trả.
- Ghi discrepancy theo từng item: thiếu, hỏng hoặc thay đổi.
- Hiển thị discrepancy cho actor vận hành và người liên quan.

## Quyết định model

- Dùng checklist trước.
- Chưa có catalog asset độc lập, serial/tag riêng hoặc custody history riêng cho
  từng accessory.
- Snapshot của giao dịch không bị thay đổi khi template gốc thay đổi.
- Chỉ tách bảng nếu Phase 0 của phase này chứng minh cần query, audit hoặc
  lifecycle độc lập.

## Boundary với Media/Image Evidence Core

Accessory checklist và evidence là hai concern song song, cùng dùng
`borrow_histories` làm business parent:

```text
borrow_histories
├── handover accessory snapshot/checklist
├── return accessory checklist/discrepancy
├── handover_evidence → media_files
└── return_evidence   → media_files
```

- Không tạo FK trực tiếp từ checklist/discrepancy sang evidence row.
- Ảnh optional lúc giao tiếp tục dùng purpose `HANDOVER`; ảnh optional lúc trả
  dùng `RETURN` theo Phase 1.
- Phase 2 không tự thêm purpose `ACCESSORY`, storage table, upload endpoint hoặc
  S3/CloudFront contract mới nếu chưa có requirement riêng.
- Checklist vẫn hoạt động đầy đủ khi không có media evidence.

## Rule khi return

```text
Phát hiện thiếu/hỏng accessory
→ return vẫn được hoàn tất
→ lưu discrepancy
→ có thể tạo issue hoặc follow-up sau
```

Discrepancy không tự động đổi asset sang `DAMAGED` nếu chưa có business rule
riêng. Nếu cần xử lý như hư hỏng, actor phải đi qua flow issue hiện hành.

## Backend implementation slices

1. Chốt model template, snapshot và discrepancy trong design phase.
2. Thêm repository/service cho create/read checklist và compare giao-trả.
3. Gắn checklist/snapshot/discrepancy với `borrow_histories`; giữ evidence là
   typed relation song song theo Phase 1, không tạo FK trực tiếp giữa hai loại.
4. Bảo đảm retry/idempotency không tạo snapshot trùng.
5. Expose API contract cho template, handover checklist, return checklist và
   discrepancy.

## Frontend implementation slices

- Checklist trong handover inspection.
- Checklist trong return inspection.
- Hiển thị trạng thái đủ/thiếu/hỏng/thay đổi.
- Cho phép ghi note cho discrepancy.
- Có empty/error/retry/loading state.
- Responsive cho thao tác trên màn hình nhỏ.

## Test matrix

- Template mới không sửa snapshot cũ.
- Item đủ được đánh dấu đúng.
- Item thiếu/hỏng được compare đúng.
- Return có discrepancy vẫn chuyển state theo flow hiện hành.
- Retry không tạo checklist hoặc discrepancy trùng.
- User chỉ được sửa checklist ở đúng bước và đúng permission.
- Accessory không bị coi là managed asset ngoài phạm vi phase.
- Checklist không có evidence vẫn create/read/compare được.
- Evidence accessory-context vẫn tuân theo `HANDOVER`/`RETURN` purpose, max count,
  atomic claim và cleanup rule của Phase 1.

## Gate acceptance

Phase 2 đạt khi:

- Có thể chứng minh checklist lúc giao và lúc trả.
- Có báo cáo discrepancy theo `borrow_histories`.
- Discrepancy không làm kẹt return queue.
- Không phát sinh lifecycle riêng cho accessory.
- Contract, migration, frontend flow và integration tests đã verified.

## Không làm trong phase này

- Không tạo asset tag cho mọi accessory.
- Không theo dõi từng accessory như asset độc lập.
- Không tự động tạo charge/penalty.
- Không chặn return vì discrepancy.
- Không tạo purpose `ACCESSORY` hoặc media relation riêng chỉ để liên kết ảnh với
  từng checklist item.
