# Tasks — Auth

> Checklist sinh từ [`plan.md`](plan.md). `[x]` phản ánh code hiện có, không thay
> thế bằng chứng kiểm thử trong [`implementation.md`](implementation.md).

- [x] AUTH-T01 [REQ-0101] Tạo TokenService ký/verify access và refresh token.
  - Depends on: environment contract
  - Verify: backend typecheck và unit test AuthService
- [x] AUTH-T02 [REQ-0102] Tạo refresh-token repository lưu `jti`/`family_id`.
  - Depends on: migration `refresh_tokens`
  - Verify: repository implementation khớp interface
- [x] AUTH-T03 [REQ-0110] Implement login và tạo token family mới.
  - Depends on: AUTH-T01, AUTH-T02, Auth repository
  - Verify: login đúng/sai và inactive user
- [x] AUTH-T04 [REQ-0111, REQ-0132] Implement atomic rotation và reuse detection.
  - Depends on: AUTH-T02
  - Verify: unit test hai refresh đồng thời
- [x] AUTH-T05 [REQ-0112] Implement logout revoke family và clear cookie.
  - Depends on: AUTH-T01, AUTH-T02
  - Verify: Postman/browser kiểm tra cookie bị xóa
- [x] AUTH-T06 [REQ-0113, REQ-0134] Public register qua UserService với role `staff`.
  - Depends on: Users, RBAC
  - Verify: payload chứa role không tự nâng quyền
- [x] AUTH-T07 [REQ-0135] Chặn login/refresh của user inactive.
  - Depends on: `users.is_active`, SessionService
  - Verify: auth service tests
- [x] AUTH-T08 [REQ-0133] Bảo vệ access token bằng `requireAuth`.
  - Depends on: AUTH-T01
  - Verify: thiếu/sai/hết hạn token trả 401
- [x] AUTH-T09 Implement FE in-memory access token và single-flight refresh.
  - Depends on: HTTP API ổn định
  - Verify: nhiều request 401 chỉ gọi refresh một lần
- [x] AUTH-T10 Chạy typecheck và unit test hiện hành.
  - Depends on: AUTH-T01–T09
  - Verify: `pnpm --filter backend typecheck`; `pnpm --filter backend test`
- [ ] AUTH-T11 Chạy database integration test hai refresh đồng thời trên MariaDB.
  - Depends on: database test environment độc lập
  - Verify: một rotation thành công, request reuse bị từ chối, family bị revoke
