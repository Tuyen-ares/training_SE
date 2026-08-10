# Project Context

Đây là technical context để hỗ trợ Codex và developer hiểu project nhanh hơn.

## Không phải source of truth

Thư mục này không phải là:

- Business requirement.
- Business rule.
- API contract.
- Frontend specification.
- Thay thế cho code, migration hoặc integration test.

Khi có conflict, phải kiểm tra các nguồn ưu tiên cao hơn:

1. [`../mvp-requirements/`](../mvp-requirements/)
2. [`../contracts/`](../contracts/)
3. [`../delivery/`](../delivery/)
4. Code, migration và integration test đang chạy.
5. Project context.
6. [`../future/`](../future/) — chỉ là thiết kế ứng viên chưa triển khai.

Project context không được override requirement hoặc contract hiện tại.

## Nội dung được phép lưu

- Architecture decision có ảnh hưởng lâu dài.
- Technical gotcha dễ làm người khác hiểu sai.
- Known gap đã có evidence từ code/test.
- Quyết định triển khai lớn và kết quả verification.
- Deployment issue đã được xác minh.

## Không lưu

Không đưa các thông tin sau vào project context:

- Password.
- JWT, refresh token hoặc access token.
- Database connection string có secret.
- API key.
- Dữ liệu riêng tư của user.
- Toàn bộ nội dung requirement hoặc changelog của mọi commit.

## Cách sử dụng

Trước task:

1. Đọc requirement/user story/business rule liên quan.
2. Đọc API contract và frontend spec nếu task có liên quan.
3. Chỉ đọc phần liên quan trong [`implementation-memory.md`](implementation-memory.md).
4. Kiểm tra code hiện tại trước khi kết luận.

Sau task:

- Chỉ cập nhật memory nếu có decision, gotcha, known gap hoặc thay đổi quan trọng
  có ích cho các task sau.
- Không ghi các chỉnh sửa nhỏ, typo hoặc mọi commit vào memory.
