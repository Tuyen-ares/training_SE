# Phase 0 — Activation và chốt thiết kế

**Status: FUTURE / NOT IMPLEMENTED**
**Loại phase: decision gate, chưa code**

## Mục tiêu

Chuyển roadmap future từ ý tưởng đã review thành một bộ requirement có thể giao
cho một phase implementation cụ thể. Phase 0 không tạo bảng, route, permission
hay UI.

## Quyết định nền đã chốt

- Dùng entity riêng cho custody, evidence và repair thay vì nhồi toàn bộ vào
  `borrow_histories` hoặc `asset_issues`.
- Giữ schema lean: chỉ tách bảng khi có nhu cầu query, audit hoặc lifecycle độc
  lập; không tạo toàn bộ candidate table chỉ vì future doc liệt kê.
- Evidence là optional, Phase 1 chỉ hỗ trợ image.
- Binary nằm ở object storage qua adapter; MariaDB chỉ giữ metadata.
- Access dùng permission hiện có và quan hệ nghiệp vụ; chưa thêm permission chung
  cho evidence.
- Acknowledgement là nút xác nhận của user đã đăng nhập và không chặn lifecycle.
- Accessories bắt đầu bằng checklist; thiếu/hỏng không chặn return.
- Repair Complete đưa asset về `AVAILABLE`; employee tạo request mới.
- Chưa thêm role IT Support; capability tiếp tục đến từ permission.
- Receipt/PDF, retention sâu và immutable audit log để Phase 5.

## Việc phải hoàn tất trước khi mở Phase 1

### 1. Chuyển thành tài liệu active

Tạo hoặc cập nhật bộ tài liệu hiện hành gồm:

- Requirement/user story và acceptance criteria.
- Business rules cho handover inspection, return inspection, evidence và
  acknowledgement.
- API contract, API catalog và OpenAPI.
- Frontend screen flow, permission states và error states.
- Data model và migration strategy.

Các tài liệu active phải nói rõ đây là scope mới đã được kích hoạt; không sửa
`docs/future/**` thành source of truth cho code.

### 2. Review độ mịn schema

Bắt đầu với các entity cần thiết nhất:

- Custody record cho handover và return.
- Evidence/media dùng chung.
- Acknowledgement nằm trong custody record nếu không có nhu cầu query/lifecycle
  độc lập.

Chưa mặc định tạo `repair_documents`, `audit_events`, receipt snapshot hoặc
managed accessory tables. Mỗi bảng thêm vào phải có lý do về truy vấn, audit,
ownership và lifecycle.

### 3. Chốt interface storage

Design Phase 1 phải quyết định:

- Provider object storage và cách cấu hình môi trường.
- Backend proxy upload hay direct upload qua signed URL.
- Cách tạo URL đọc có kiểm soát quyền.
- MIME, kích thước tối đa, tên file và key naming.
- Cách xử lý upload thành công nhưng ghi metadata/lifecycle thất bại.
- Cách retry và dọn orphan object.

Đây là technical design cần xác nhận, không coi các lựa chọn trên là API đã
chốt chỉ vì roadmap có nhắc tới object storage.

### 4. Chốt permission matrix

Phải ghi rõ cho từng thao tác:

- Actor vận hành được tạo/xem handover evidence.
- Actor vận hành được tạo/xem return evidence.
- Người mượn được xem evidence của custody/request của mình.
- Người xử lý issue/repair được xem evidence repair.
- User không thuộc quan hệ nghiệp vụ nhận `403`.

Không thêm `evidence.view` hoặc role IT Support nếu chưa có requirement chứng minh
nhu cầu.

## Gate acceptance

Phase 0 đạt khi:

- Requirement, business rule, contract, schema và frontend spec không mâu thuẫn.
- Có permission matrix cho từng read/write operation.
- Có migration/backward-compatibility strategy cho dữ liệu MVP cũ.
- Có quyết định storage và failure model đủ để implement an toàn.
- Có test matrix cho permission, concurrency, upload failure và legacy API.
- Người review xác nhận Phase 1 có thể bắt đầu mà không cần đoán thêm quyết định
  nghiệp vụ.

## Không làm trong phase này

- Không tạo Prisma model/migration.
- Không thêm endpoint upload.
- Không đổi state machine MVP.
- Không backfill evidence cho history cũ.
- Không đổi tên permission legacy.
