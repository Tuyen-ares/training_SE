# 03 — Người dùng & phòng ban (Users & Departments)

> Aggregate root: `users`. Module nền, làm sớm vì nhiều module trỏ tới `users`.

## 1. Goals
- CRUD người dùng (do admin quản lý) và phòng ban.
- Đảm bảo email/phone duy nhất; hash password khi tạo/đổi.

## 2. Non-goals
- Không xử lý login/token (module 01).
- Không gán role/permission (module 04) — chỉ tạo user; việc gán role thuộc RBAC.

## 3. Data model (Prisma, đã có)
- `users`: id, department_id, name, password (bcrypt), email (unique), phone (unique).
- `departments`: id, name (unique).

## 4. Constraints
- `email` và `phone` duy nhất.
- Password luôn hash bcrypt trước khi lưu; không bao giờ trả password ra response.
- Không xóa department còn user thuộc về.

## 5. Acceptance Criteria (EARS)

### Ubiquitous
- REQ-0301: The system shall hash password bằng bcrypt trước khi lưu.
- REQ-0302: The system shall không bao giờ trả trường `password` trong bất kỳ response nào.

### Event-driven
- REQ-0310: When admin tạo user với email hoặc phone đã tồn tại, the system shall từ chối và báo trùng.
- REQ-0311: When admin tạo user, the system shall gán `department_id` hợp lệ (phòng ban tồn tại).
- REQ-0312: When admin đổi password của user, the system shall hash lại giá trị mới trước khi lưu.

### Unwanted behavior
- REQ-0330: If `department_id` không tồn tại, then the system shall từ chối tạo/sửa user.
- REQ-0331: If xóa department còn user tham chiếu, then the system shall từ chối.

## 6. Events emitted
(không có ở bản này)

## 7. Câu hỏi mở
- [ ] Xóa user là xóa cứng hay soft-delete? (lưu ý FK từ borrow_requests, repair_logs)
- [ ] User tự đổi thông tin cá nhân được không, hay chỉ admin?
