# FLOW-15 – Báo và xem issue

## Goal

Ghi nhận issue hợp lệ và theo dõi thông tin xử lý.

## Actor

Người đang mượn asset hoặc user có permission issue theo phạm vi.

## Related User Stories

`US-F06-01`, `US-F06-02`.

## Preconditions

Asset tồn tại; reporter thuộc đối tượng được phép.

## Main Flow

1. User mở Asset Detail hoặc Issue List và bắt đầu report context.
2. User nhập mô tả hợp lệ rồi gửi.
3. Hệ thống tạo issue REPORTED, ghi reporter/time và không tự chuyển asset DAMAGED.
4. User có permission xử lý xem issue trong Issue List/Detail.

## Alternative Flows

- Issue từ damaged return đã là CONFIRMED và mở ở Issue Detail, không đi qua report form.

## Error / Invalid States

- Employee không đang mượn asset hoặc asset không tồn tại: từ chối report.
- Thiếu permission xem issue: không cung cấp dữ liệu.

## Result

Issue hợp lệ xuất hiện trong flow xử lý mà asset chưa bị đổi status chỉ vì mới báo.

## Related Screens

`SCR-F02-02`, `SCR-F06-01`, `SCR-F06-02`.

# FLOW-16 – Xác minh hoặc từ chối issue

## Goal

Xác nhận chỉ issue có thật mới ảnh hưởng status asset.

## Actor

User có permission xác minh issue.

## Related User Stories

`US-F06-03`.

## Preconditions

Issue đang REPORTED.

## Main Flow

1. User mở Issue Detail.
2. User chọn confirm hoặc reject trong workflow state phù hợp.
3. Confirm chuyển issue REPORTED sang CONFIRMED và asset sang DAMAGED.
4. Reject chuyển issue sang REJECTED mà asset không thành DAMAGED do issue này.
5. UI refresh context và Issue List.

## Alternative Flows

- Damaged return không cần confirm lại: issue đã CONFIRMED, history đã ghi return.

## Error / Invalid States

- Issue không REPORTED hoặc transition asset/issue thất bại: không lưu trạng thái một phần.

## Result

Issue được xác minh nhất quán với status asset.

## Related Screens

`SCR-F06-01`, `SCR-F06-02`, `SCR-F02-02`.

# FLOW-17 – Bắt đầu và cập nhật sửa chữa

## Goal

Đưa issue/asset vào sửa chữa và theo dõi dữ liệu quá trình.

## Actor

User có permission quản lý sửa chữa.

## Related User Stories

`US-F06-04`, `US-F06-05`.

## Preconditions

Issue CONFIRMED và asset DAMAGED để bắt đầu sửa.

## Main Flow

1. User mở Issue Detail và chọn bắt đầu sửa.
2. Hệ thống chuyển issue/asset cùng sang IN_REPAIR, ghi người xử lý/ngày bắt đầu phù hợp.
3. Ở Start Repair, UI chỉ yêu cầu thông tin khởi tạo: repair provider, cost, start date và diagnosis/initial notes; không hiển thị trường Repair result.
4. Ở Update/Complete/Fail, user cập nhật repair provider, thời gian, cost, result hoặc note ở giai đoạn cho phép.
5. UI hiển thị thông tin repair mới trên cùng Issue Detail.

## Alternative Flows

- Update form chỉ hiển thị field/action được phép bởi status và permission.

## Error / Invalid States

- Issue/asset không ở source state, chi phí/thời gian không hợp lệ hoặc thiếu permission: không thay đổi dữ liệu.

## Result

Asset IN_REPAIR và dữ liệu xử lý tập trung trong một issue context.

## Related Screens

`SCR-F06-01`, `SCR-F06-02`, `SCR-F02-02`.

# FLOW-18 – Kết thúc sửa chữa

## Goal

Ghi nhận kết quả thành công hoặc thất bại để asset có trạng thái vận hành đúng.

## Actor

User có permission quản lý sửa chữa.

## Related User Stories

`US-F06-06`.

## Preconditions

Issue và asset đang IN_REPAIR.

## Main Flow

1. User mở action kết thúc trên Issue Detail.
2. User ghi kết quả/time cần thiết và chọn thành công hoặc thất bại.
3. Thành công: issue COMPLETED, asset AVAILABLE.
4. Thất bại: issue FAILED, asset DAMAGED.
5. UI cập nhật Issue Detail, Asset Detail và Issue List.

## Alternative Flows

- Quyết định chuyển RETIRED là action asset riêng của user có thẩm quyền, không tự xảy ra khi repair FAILED.

## Error / Invalid States

- Issue không IN_REPAIR hoặc transaction thất bại: không cập nhật một phần.

## Result

Issue kết thúc và asset có state chính xác, không tự retire.

## Related Screens

`SCR-F06-02`, `SCR-F06-01`, `SCR-F02-02`.

## Implementation alignment — 2026-08-05

- Routes: `/asset-issues` and `/asset-issues/:id`.
- Issue List is API-backed, permission-guarded by `asset_issue.view`, filterable by status/asset and server-paginated.
- Issue Detail is the single repair context. Confirm/reject/start/update/complete/fail actions are shown from effective permissions and current issue status.
- Repair data entry uses Ant Design modal states; invalid HTTP 409 transitions show safe feedback and reload canonical issue data.
- Start Repair uses the note field as `Diagnosis / Initial notes`; `Repair result` is shown only for Update/Complete/Fail, and is required when completing a repair.
- The timeline only renders milestones supported by both persisted status and timestamps; it does not infer a lifecycle from inconsistent legacy dates.
