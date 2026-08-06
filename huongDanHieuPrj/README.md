# Hướng dẫn đọc hiểu project BigIn

Thư mục này dành cho người mới đang vibecode và muốn hiểu hệ thống trước khi sửa code.

## Cách đọc quan trọng nhất

Không đọc toàn bộ frontend rồi mới đọc toàn bộ backend. Hãy đọc từng **lát cắt nghiệp vụ**:

```text
Feature
→ User Story / hành động nghiệp vụ
→ Screen chứa hành động
→ Frontend function
→ Frontend service
→ API
→ Route + permission
→ Controller
→ Service
→ Repository
→ Database
→ Integration test
```

`Feature` giúp xác định khu vực đang học. `User Story` hoặc một hành động nghiệp vụ là đơn vị học chính. `Screen` chỉ là nơi để tìm nút và hàm thực hiện hành động đó.

## Thứ tự đọc đề xuất

1. [Bắt đầu từ đâu](00-bat-dau-tu-dau.md)
2. [Đọc requirement](01-doc-requirement.md)
3. [Feature, User Story, Screen và API](02-feature-va-api.md)
4. [Cách trace code từ FE xuống BE](03-cach-truy-luong-code.md)
5. Đọc một ví dụ hoàn chỉnh, bắt đầu với [Login](04-vi-du-login.md)
6. Tiếp tục với [Asset](05-vi-du-asset.md), [Borrow](06-vi-du-borrow.md), [Approval/Handover/Return](07-vi-du-approval-handover-return.md)
7. Đọc [Issue, Repair và Notification](08-vi-du-issue-repair-notification.md)
8. Xem [Database và Prisma](09-database-va-prisma.md)
9. Học cách [debug và test](10-debug-network-va-test.md)
10. Dùng [bảng theo dõi feature](11-bang-theo-doi-feature.md)

## Nguồn sự thật của project

- [MVP context](../docs/mvp-requirements/00-context.md)
- [MVP scope](../docs/mvp-requirements/01-mvp-scope.md)
- [Business Rules](../docs/mvp-requirements/04-business-rules.md)
- [Functional Requirements](../docs/mvp-requirements/05-functional-requirements.md)
- [Feature files](../docs/mvp-requirements/06-features/)
- [User Stories](../docs/mvp-requirements/07-user-stories/)
- [Traceability matrix](../docs/mvp-requirements/08-traceability-matrix.md)
- [API catalog](../docs/contracts/api-catalog.md)
- [Delivery status](../docs/delivery-status.md)
- [Frontend screen inventory](../docs/delivery/frontend-spec/02-screen-inventory.md)

## Bản đồ đọc theo từng Feature

Khi đã hiểu cách đọc chung, dùng [Feature Guides](feature-guides/README.md). Mỗi file F01–F08 bắt đầu bằng bức tranh nghiệp vụ, link spec, User Story/action, đường trace tới code/test, `SPEC EXPECTS`, `CURRENT CODE`, `GAPS` và `Minimum Reading Path` 3–5 file.

## Khi nào được coi là đã hiểu một User Story?

Bạn cần trả lời được:

1. Ai thực hiện?
2. Người đó làm gì?
3. Điều kiện trước khi làm là gì?
4. API nào được gọi?
5. Business rule nằm ở lớp nào?
6. Database thay đổi gì?
7. Kết quả sau cùng là gì?

Nếu trả lời được 7 câu này thì chuyển sang User Story tiếp theo. Không cần đọc hết mọi dòng trong file.
