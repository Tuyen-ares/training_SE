# Future Scale — Open Questions

**Status: OPEN**

Các câu hỏi dưới đây chưa được chốt. Codex không được tự chọn đáp án, đổi schema,
đổi API hoặc implement behavior dựa trên các câu hỏi này.

## 1. Repair Complete và handback

**Context:** Asset của employee được nhận về để sửa, sau đó repair hoàn tất.

**Possible options:**

- `AVAILABLE` sau khi sửa.
- Giao lại borrower cũ và chuyển `BORROWED`.
- Trạng thái chờ bàn giao lại, sau đó employee xác nhận nhận máy.

**Decision:** NOT DECIDED

## 2. Evidence bắt buộc hay tùy chọn

**Context:** Ảnh/video có thể dùng làm bằng chứng khi bàn giao, trả và sửa chữa.

**Possible options:**

- Tất cả evidence đều optional.
- Chỉ một số loại event bắt buộc evidence.
- Tùy loại asset hoặc trạng thái mà yêu cầu evidence.

**Decision:** NOT DECIDED

## 3. Loại evidence cần hỗ trợ

**Context:** Workflow có thể cần ảnh serial, màn hình, ngoại hình, phụ kiện và video lỗi.

**Possible options:**

- Chỉ image.
- Image và video.
- Image/video cùng danh sách evidence type được giới hạn.

**Decision:** NOT DECIDED

## 4. Evidence storage

**Context:** Cần chọn nơi lưu file và metadata.

**Possible options:**

- Object storage/cloud storage.
- Storage nội bộ của backend.
- Dịch vụ media bên ngoài.

**Decision:** NOT DECIDED

## 5. Accessory model

**Context:** Cần đối chiếu phụ kiện lúc giao và lúc trả.

**Possible options:**

- Accessory là managed entity riêng.
- Accessory là checklist của từng handover/return.
- Kết hợp asset phụ kiện có tag và checklist đơn giản.

**Decision:** NOT DECIDED

## 6. Accessory có asset tag riêng không?

**Context:** Một số phụ kiện có thể cần theo dõi độc lập, số khác chỉ là vật đi kèm.

**Possible options:**

- Mọi accessory có asset tag riêng.
- Chỉ một số loại accessory có asset tag.
- Accessory không có asset tag và chỉ nằm trong checklist.

**Decision:** NOT DECIDED

## 7. Electronic acknowledgement

**Context:** Cần xác nhận employee đã nhận hoặc trả asset.

**Possible options:**

- Button confirmation khi user đã authenticated.
- Vẽ chữ ký trên màn hình.
- Xác nhận qua email/link.
- Chữ ký số/certificate.

**Decision:** NOT DECIDED

## 8. Return receipt

**Context:** Business có thể cần biên bản bàn giao/trả để đối chiếu về sau.

**Possible options:**

- Chỉ hiển thị trên UI.
- Sinh PDF.
- Lưu snapshot dữ liệu lúc xác nhận.
- Kết hợp PDF và snapshot.

**Decision:** NOT DECIDED

## 9. Repair documents

**Context:** Sửa bên ngoài có thể tạo invoice hoặc biên bản bảo hành.

**Possible options:**

- Không upload tài liệu.
- Upload invoice/biên bản.
- Upload tài liệu và bắt buộc với external provider.

**Decision:** NOT DECIDED

## 10. Repair parts và warranty

**Context:** Cần biết đã thay linh kiện nào và còn bảo hành hay không.

**Possible options:**

- Chỉ ghi text trong repair note.
- Có danh sách parts riêng.
- Có parts + warranty document + expiration.

**Decision:** NOT DECIDED

## 11. Permission normalization

**Context:** Một số permission hiện tại có thể còn tên legacy.

**Possible options:**

- Giữ nguyên để tương thích.
- Normalize sang tên domain mới bằng migration.
- Chấp nhận alias trong một giai đoạn chuyển tiếp.

**Decision:** NOT DECIDED

## 12. IT Support role

**Context:** Hiện Manager/Admin có thể sở hữu capability xử lý IT operations.

**Possible options:**

- Không thêm role IT Support.
- Thêm role IT Support khi số lượng người xử lý tăng.
- Thêm role nhưng vẫn cấp permission độc lập.

**Decision:** NOT DECIDED

## 13. Immutable audit log

**Context:** Evidence và custody có thể cần lịch sử không thể sửa/xóa tùy ý.

**Possible options:**

- Dùng các bảng nghiệp vụ hiện tại.
- Thêm audit event log.
- Audit log append-only có retention policy.

**Decision:** NOT DECIDED

## 14. Retention và privacy

**Context:** Ảnh, video và chữ ký có thể chứa dữ liệu cá nhân hoặc thông tin thiết bị.

**Possible options:**

- Retention cố định theo loại evidence.
- Retention theo policy của công ty.
- Cho phép xóa theo quyền và lưu audit việc xóa.

**Decision:** NOT DECIDED
