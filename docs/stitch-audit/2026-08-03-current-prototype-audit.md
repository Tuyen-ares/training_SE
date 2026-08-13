# Audit Stitch hiện tại – BigIn Asset Management

**Ngày audit:** 03/08/2026
**Phạm vi:** đọc-only. Không screen nào trên Stitch, requirement, frontend specification, design system, code, API hay database bị sửa trong audit này.

## Nguồn và phương pháp

Thứ tự đối chiếu là `docs/mvp-requirements` → `docs/frontend-spec` → `design/DESIGN_SYSTEM.md` → `design/DESIGN.md` → Stitch. Vì vậy, Stitch chỉ là prototype/visual reference, không phải nguồn định nghĩa nghiệp vụ.

Inventory được lấy trực tiếp bằng Stitch MCP từ project `BigIn Asset Management` (`projects/11686200964836917081`). Mỗi screen được map với Screen Inventory gồm 18 logical screen/template tại thời điểm audit. Asset QR Scan là template implementation được bổ sung sau đó và không thuộc prototype Stitch gốc. Các screen đại diện của nhóm Asset, Borrow, Return, Repair, Dashboard và Login cũng được kiểm tra visual để đánh giá pattern AppShell, action, status và workflow. Đây không phải kiểm tra pixel-perfect.

## A. Tổng quan

- **39** Stitch screen vật lý.
- **18** logical screen/template trong Frontend Specification.
- **0 KEEP**, **14 UPDATE**, **12 MERGE**, **3 REPLACE**, **10 OUT_OF_SCOPE**, **0 UNKNOWN**.
- Có **3 logical screen chính chưa có mockup phù hợp**: Dashboard chung theo permission, Fulfillment Queue và Notification Center. Access & Resource Result có mockup Forbidden nhưng còn thiếu variant Not Found.

`KEEP = 0` không có nghĩa các screen cũ không thể tái dùng visual. Phần lớn vẫn giữ được AppShell, layout table, form hoặc detail; nhưng không screen nào vừa khớp nghiệp vụ MVP vừa khớp workflow/state mới mà không cần chỉnh.

## B. Inventory và mapping

| # | Stitch screen ID | Tên trên Stitch | Domain / type hiện tại | Logical screen đích | Kết luận | Lý do chính |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `2b7024b0…` | Tổng quan (Nhân viên) | Dashboard | SCR-APP-01 | REPLACE | Dashboard phải chung theo permission, không theo role. |
| 2 | `d68d86ae…` | Trả thiết bị | Workflow | SCR-F05-01 | MERGE | Return là state trong Fulfillment Queue, không phải page độc lập. |
| 3 | `93037eab…` | Xác nhận từ chối | Workflow | SCR-F03-03 | MERGE | Reject detail cần reason trong Request Detail. |
| 4 | `eb4b6f1a…` | Yêu cầu của tôi (Normalized) | List | SCR-F03-02 | UPDATE | Cần trạng thái header mới và entry/action thu hồi có điều kiện. |
| 5 | `290c96eb…` | Chỉnh sửa người dùng | Edit form | SCR-F08-02 | MERGE | Dùng chung User Form & Roles cho create/update/role assignment. |
| 6 | `b7d19722…` | Bắt đầu sửa chữa | Workflow | SCR-F06-02 | MERGE | Là transition trong Issue Detail. |
| 7 | `f61effde…` | Chi tiết yêu cầu | Detail | SCR-F03-03 | UPDATE | Cần view dùng chung owner/approver/fulfillment và detail-level approval. |
| 8 | `1c897978…` | Truy cập bị từ chối | System state | SCR-SYS-02 | UPDATE | Giữ Result pattern nhưng bổ sung Not Found và safe return. |
| 9 | `20948b66…` | Chi tiết vai trò & Phân quyền | RBAC detail | — | OUT_OF_SCOPE | MVP không CRUD role/permission. |
| 10 | `985af4a8…` | Quản lý danh mục | Catalog | SCR-F02-04 | UPDATE | Chỉ create/update brand/type/model; không suy ra delete. |
| 11 | `daf2ab91…` | Lỗi trạng thái sửa chữa | System/workflow state | SCR-F06-02 | MERGE | Error state trong Issue Detail, không phải page. |
| 12 | `0688b043…` | Đăng ký (Refined) | Authentication | — | OUT_OF_SCOPE | Không có public registration trong MVP. |
| 13 | `c3b4a30b…` | Danh mục quyền hạn | RBAC list | — | OUT_OF_SCOPE | Permission catalog/CRUD ngoài MVP. |
| 14 | `db352461…` | Đăng nhập | System form | SCR-SYS-01 | UPDATE | Bỏ link registration và các action chưa được scope chốt. |
| 15 | `ff24ecd4…` | Tổng quan (Quản lý) | Dashboard | SCR-APP-01 | REPLACE | Dashboard chung permission-based, không role dashboard. |
| 16 | `cfc99583…` | Lịch sử mượn toàn hệ thống | List/history | SCR-F05-02 | UPDATE | Gộp phạm vi current/own/all theo permission và dữ liệu từ history thật. |
| 17 | `3218165c…` | Thêm thiết bị mới | Create form | SCR-F02-03 | UPDATE | Form create/edit dùng lại; status không là field chỉnh tự do. |
| 18 | `7d4c7ff4…` | Danh sách vai trò | RBAC list | — | OUT_OF_SCOPE | Chỉ gán/gỡ role có sẵn trong User Form. |
| 19 | `6b05b127…` | Danh sách người dùng (Normalized) | List | SCR-F08-01 | UPDATE | Action phải theo permission, có avatar URL và activate/deactivate. |
| 20 | `ba6d0885…` | Danh sách sửa chữa (Normalized) | List | SCR-F06-01 | UPDATE | Đổi thành Asset Issue List; support toàn bộ trạng thái issue. |
| 21 | `92a0b4da…` | Lịch sử mượn của tôi | List/history | SCR-F05-02 | UPDATE | Một screen tái dùng, scope phụ thuộc permission. |
| 22 | `153107b1…` | Đăng ký (Refined) | Authentication | — | OUT_OF_SCOPE | Registration lặp, ngoài MVP. |
| 23 | `43973089…` | Hàng chờ phê duyệt (Normalized) | Queue/list | SCR-F04-01 | UPDATE | Queue phải nhận biết detail `PENDING`, không chỉ header. |
| 24 | `c48a1b56…` | Chi tiết yêu cầu (Chờ duyệt) | Approval detail | SCR-F03-03 | MERGE | Cùng Request Detail với screen #7. |
| 25 | `c7c4ffa…` | Tổng quan (Admin) | Dashboard | SCR-APP-01 | REPLACE | Dashboard phải theo capability, không hard-code Admin. |
| 26 | `08234f5e…` | Đăng ký (Spacing Standardized) | Authentication | — | OUT_OF_SCOPE | Registration lặp, ngoài MVP. |
| 27 | `adf2ff87…` | Chi tiết người dùng | Detail | SCR-F08-02 | MERGE | Hợp nhất vào create/edit/role form context. |
| 28 | `3d2e75f5…` | Chi tiết sửa chữa (Normalized) | Detail/workflow | SCR-F06-02 | UPDATE | Dùng Asset Issue, transition lifecycle mới và action theo permission. |
| 29 | `e4f33ddc…` | Hoàn tất sửa chữa | Workflow | SCR-F06-02 | MERGE | Terminal transition trong Issue Detail. |
| 30 | `071bc8c9…` | Thêm người dùng mới (Normalized) | Create form | SCR-F08-02 | MERGE | Cùng reusable User Form & Roles. |
| 31 | `2cf1be48…` | Đăng ký (Spacing Fixed) | Authentication | — | OUT_OF_SCOPE | Registration lặp, ngoài MVP. |
| 32 | `b71b221e…` | Đăng ký (Spacing Standardized) | Authentication | — | OUT_OF_SCOPE | Registration lặp, ngoài MVP. |
| 33 | `6e66e275…` | Chi tiết thiết bị | Detail | SCR-F02-02 | UPDATE | Cần actions/status/QR/image theo scope mới; bỏ asset-history ngoài MVP. |
| 34 | `b8964a52…` | Quản lý phòng ban | Administration | — | OUT_OF_SCOPE | Department CRUD ngoài MVP. |
| 35 | `e9f25755…` | Project Brief & PRD | Documentation | — | OUT_OF_SCOPE | Không phải workflow nghiệp vụ MVP. |
| 36 | `a4defcc2…` | Chi tiết phê duyệt | Approval detail | SCR-F03-03 | MERGE | Approval context dùng chung Request Detail. |
| 37 | `77759899…` | Quản lý thiết bị (Admin) | Asset list | SCR-F02-01 | MERGE | Hợp nhất với Asset List theo permission. |
| 38 | `641c8d34…` | Danh sách thiết bị (Nhân viên) | Asset list | SCR-F02-01 | MERGE | Hợp nhất với Asset List theo permission/selection mode. |
| 39 | `80fc0c72…` | Tạo yêu cầu mượn (Normalized) | Create workflow | SCR-F03-01 | UPDATE | Chọn nhiều AVAILABLE asset; asset chỉ RESERVED khi approval. |

## C. Missing screens

| Logical screen | Hiện trạng | Cần có trong lần chỉnh Stitch sau |
| --- | --- | --- |
| SCR-APP-01 Workspace Dashboard | Chỉ có 3 dashboard theo role. | Một dashboard chung: shortcut/queue chỉ hiện khi user có permission; không KPI/analytics mới. |
| SCR-F05-01 Fulfillment Queue | Có return page cũ, chưa có queue dùng chung. | Một queue/tab cho `RESERVED` cần handover và `BORROWED` cần return. |
| SCR-F07-01 Notification Center | Không có screen. | List notification của chính user, unread/read và logical navigation. |
| SCR-SYS-02 Not Found variant | Có Forbidden. | Một variant resource-not-found không lộ resource và có safe return. |

## D. Missing variants / workflow states

Không variant nào dưới đây là một logical page mới.

- **Asset:** list selection mode khi tạo request; QR lookup found/not-found; asset detail có image, status/action theo permission; create/edit form; retire confirmation.
- **Borrow request:** detail cho owner, reviewer và fulfillment; hiển thị `approval_status` từng detail và rejection reason; withdrawal/cancellation confirmation và blocked state khi request đã có actual handover / đã tồn tại `borrow_history` cho bất kỳ detail nào.
- **Approval:** approve một detail; reject có reason bắt buộc; Approve All có kết quả **partial success** (detail tranh chấp vẫn `PENDING`, không tự `REJECTED`).
- **Handover & return:** handover confirmation; normal return; damaged return ghi condition, tạo `CONFIRMED` issue và chuyển asset sang `DAMAGED` trong cùng workflow result.
- **Issue & repair:** report; confirm/reject; start/update repair; completed/failed. Các action chỉ hiện ở transition hợp lệ.
- **Notification:** empty, unread/read, related entity missing, forbidden target.
- **User administration:** create/edit với avatar URL; assign/remove existing role; activate/deactivate confirmation; duplicate/invalid field state.
- **System:** login invalid/inactive; loading/empty/error; Forbidden và Not Found.

## E. Screens cần merge

- `Quản lý thiết bị (Admin)` + `Danh sách thiết bị (Nhân viên)` → **Asset List** theo permission, thêm selection mode.
- `Chi tiết yêu cầu`, `Chi tiết yêu cầu (Chờ duyệt)`, `Chi tiết phê duyệt` → **Borrow Request Detail** dùng chung.
- `Trả thiết bị` → workflow state của **Fulfillment Queue**, cùng handover và damaged return.
- `Danh sách/Lịch sử mượn của tôi/Lịch sử toàn hệ thống` → **Borrowing Activity** theo scope permission.
- `Danh sách/Chi tiết sửa chữa`, `Bắt đầu`, `Hoàn tất`, `Lỗi trạng thái sửa chữa` → **Asset Issue List** + **Asset Issue Detail** với workflow states.
- `Thêm/Chỉnh sửa/Chi tiết người dùng` → **User Form & Roles** (cùng User List làm entry).
- `Xác nhận từ chối` → workflow state của **Borrow Request Detail**.

## F. Screens cần replace

Ba dashboard `Nhân viên`, `Quản lý`, `Admin` cần được thay bằng **một** Workspace Dashboard. Có thể tái dùng visual card/shortcut và layout queue; không tái sử dụng segmentation theo role hoặc KPI/chart như một source of truth.

## G. Out-of-scope screens

- Public registration: 4 screen lặp (`0688b043…`, `153107b1…`, `08234f5e…`, `2cf1be48…`, `b71b221e…` là 5 physical variants trong inventory, gồm các bản refined/spacing).
- Department management: `b8964a52…`.
- RBAC CRUD: `7d4c7ff4…`, `20948b66…`, `c3b4a30b…`.
- Project Brief & PRD: `e9f25755…`.

> Lưu ý: số dòng Registration thực tế là 5; tổng OUT_OF_SCOPE vẫn là 10 screen vì phần còn lại gồm 3 RBAC, Department và PRD.

## H. Business discrepancies

| Mức độ | Phát hiện | Tác động / hướng chỉnh |
| --- | --- | --- |
| Critical | Ba dashboard và sidebar cũ chia theo Nhân viên/Quản lý/Admin. | Đổi thành menu, widget, queue và action theo **permission thực tế**; flat RBAC không suy quyền từ tên role. |
| Critical | Approval prototype có ngôn ngữ/action “Duyệt phiếu yêu cầu”. | Approval là từng `borrow_request_detail`; Request Detail phải thể hiện từng status/rejection reason và reservation. |
| Critical | Create-request cũ không thể hiện rõ asset còn `AVAILABLE` sau khi gửi. | Nhiều request `PENDING` có thể chọn cùng asset; chỉ approval atomically chuyển `AVAILABLE → RESERVED`. |
| High | Return là page riêng và chưa thể hiện damaged-return tạo issue. | Gộp vào Fulfillment Queue; return hỏng phải ghi return, tạo issue `CONFIRMED`, chuyển asset `BORROWED → DAMAGED`. |
| High | Repair prototype dùng `sửa chữa`/page transition rời. | Chuẩn hóa thành `asset_issues`: `REPORTED → CONFIRMED/REJECTED → IN_REPAIR → COMPLETED/FAILED`; không để issue REPORTED tự đổi asset sang DAMAGED. |
| High | Asset Detail đang có tab “Lịch sử mượn” như history của asset. | Không tạo asset-history module riêng chỉ vì có dữ liệu lịch sử. Nếu Asset Detail cần related borrowing records, chúng phải reuse dữ liệu borrow history đã có và trace được về User Story/FR; Borrowing Activity vẫn là screen chính cho lịch sử mượn. |
| High | Asset form hiển thị asset status như field nhập thông thường. | Status chỉ đổi qua workflow nghiệp vụ, không phải trường CRUD tự do. |
| Medium | Login có “Đăng ký ngay”, đồng thời nhiều registration screens vẫn tồn tại. | Gỡ entry public registration; MVP chỉ user nội bộ đã tồn tại. |
| Medium | Catalog/RBAC/Department có thể tạo cảm giác có CRUD/delete toàn diện. | Catalog chỉ create/update theo scope; không thêm delete hay RBAC/Department CRUD. |
| Medium | Không có Notification Center. | Notification Center phải bám event/recipient mapping đã được requirement chốt và recipient theo permission/entity, không hard-code role. Chỉ các quyết định UI presentation chưa rõ mới được đưa vào frontend Open Questions. |

## I. Design System discrepancies

| Chủ đề | Phát hiện | Hướng xử lý |
| --- | --- | --- |
| Permission-aware navigation (§3.4, §9.3) | Các shell/dashboard cũ biểu đạt navigation theo role. | Một AppShell, navigation/action render theo permission; direct access vẫn dùng Forbidden. |
| Dashboard (§11.1) | Dashboard cũ có tổng tài sản và các thẻ số liệu/tiến độ sửa chữa theo role. | Chỉ giữ shortcut/queue đã có; KPI/chart phải optional và không tạo nghiệp vụ mới. |
| Domain status (§5.4) | Nhãn/chip cũ không thể hiện đầy đủ state baseline mới như `RESERVED`, detail `PENDING/APPROVED/REJECTED`, issue lifecycle. | Ánh xạ tag/badge từ requirement/domain spec, không để Stitch tự đặt lifecycle. |
| Page anatomy / reusable workflow | Return, reject, repair start/complete/error bị tách thành full page. | Dùng screen cha + dialog/drawer/workflow state; chọn modal/drawer sau khi design system quyết định. |
| Asset form | Status được trình bày như editable input. | Form chỉ chỉnh metadata được phép; state transition có confirmation/context riêng. |
| Primary-action hierarchy | Một số screen cũ đặt action theo role/context cũ. | Mỗi surface có một primary action phù hợp state; destructive/impactful action phải có confirmation. |
| System states | Forbidden có reference nhưng chưa thấy Not Found; loading/empty/error không được phủ có hệ thống. | Bổ sung variants vào system/reusable screens, không tạo route/module mới. |
| Responsive intent | Inventory hiện chỉ có desktop prototype. | Khi chỉnh screen, ghi rõ table-to-card/collapsed navigation intent theo DESIGN_SYSTEM; không cần tạo mobile page logic riêng. |

Visual foundation có thể tái dùng: AppShell trắng, table/list density, form surface, hierarchy detail và palette cam Ant Design ở các screen đã normalized. Các điểm trên là cần chỉnh logic/pattern, không yêu cầu thay toàn bộ visual language.

## J. Thứ tự chỉnh Stitch đề xuất

1. **Chốt AppShell một lần:** Dashboard chung theo permission, sidebar/header, Forbidden + Not Found. Loại bỏ entry registration và role-based navigation khỏi template.
2. **Chuẩn hóa Asset:** hợp nhất Asset List, chỉnh Asset Detail/Form/Catalog, bổ sung selection/QR variants.
3. **Chuẩn hóa Borrow & Approval:** Create Request → My Requests → shared Request Detail → Review Queue; thêm approval detail/reject/Approve All partial-success/withdraw states.
4. **Hoàn thiện Fulfillment:** dựng Fulfillment Queue và các handover, normal return, damaged return states; gộp Borrowing Activity.
5. **Chuẩn hóa Issue & Repair:** Issue List/Detail cùng toàn bộ lifecycle transition, không giữ các page transition rời.
6. **Bổ sung Notifications và Administration:** Notification Center; User List + reusable User Form & Roles.
7. **Review cross-cutting:** permission visibility, status mapping, loading/empty/error, primary-action hierarchy và responsive intent trên mọi screen đã cập nhật.

## Điều kiện trước khi bắt đầu chỉnh Stitch

- Không sửa/generate/delete screen từ báo cáo này.
- Một thay đổi Stitch sau này chỉ bắt đầu sau khi người dùng duyệt mapping và thứ tự trên.
- Khi implementation/visual mới cần quyết định UI chưa có trong source of truth, ghi Open Question thay vì để prototype tự định nghĩa nghiệp vụ.
