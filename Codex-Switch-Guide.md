# Hướng dẫn sử dụng Codex Switch

Codex Switch là extension VS Code dành cho người dùng nhiều tài khoản Codex, workspace hoặc môi trường. Extension giúp quản lý profile, chuyển đổi nhanh và đồng bộ auth giữa CLI và extension.

---

## 1. Cài đặt nhanh

1. Đăng nhập Codex CLI trong runtime bạn thực sự dùng:
   - Nếu dùng WSL từ Windows và đã bật `chatgpt.runCodexInWindowsSubsystemForLinux`, chạy:
     ```
     wsl codex login
     ```
   - Hoặc đăng nhập từ giao diện Chat/Codex.
2. Mở Command Palette (`Ctrl+Shift+P`) → chạy **Codex Switch: Manage Profiles**.
3. Chọn **Import from current auth.json** hoặc **Import from selected JSON file**.
4. Chuyển profile bằng cách:
   - Click vào status bar.
   - Click vào link trong tooltip.
   - Hoặc dùng lệnh **Codex Switch: Manage Profiles**.

---

## 2. Thêm tài khoản Chat mới

> **Không dùng logout** để thêm account mới — sẽ làm mất session token hiện tại.

Các bước đúng:

1. Chạy **Codex Switch: Prepare for New Login (Chat)**.
2. Extension sẽ:
   - Lưu `auth.json` hiện tại vào profile phù hợp (nếu khớp).
   - Xoá `auth.json` local.
   - Clear active profile.
   - Reload VS Code để Chat hiện màn hình login.
3. Nếu tài khoản hiện tại chưa được lưu thành profile, extension sẽ hỏi:
   - **Cancel**
   - **Save Profile and Continue**
   - **Continue without saving**
4. Đăng nhập bằng tài khoản Chat/Codex mới.

---

## 3. Cách chuyển profile

Status bar hiển thị profile đang active. Click vào đó để chuyển — hành vi tuỳ theo cấu hình `codexSwitch.statusBarClickBehavior`:

| Mode         | Hành vi                                                       |
| ------------ | ------------------------------------------------------------- |
| `cycle`      | Lần lượt chuyển qua tất cả profile đã lưu.                    |
| `toggleLast` | Chuyển qua lại giữa profile hiện tại và profile trước đó.     |
| `selector`   | Mở menu chọn profile.                                         |

Sau khi chuyển thành công, extension ghi auth vào file auth đang dùng, CLI và extension luôn đồng bộ.

> Trước khi chuyển khỏi một live account chưa lưu, extension sẽ hỏi: Cancel / Save & Continue / Continue without saving.

---

## 4. Cách resolve file auth

Mặc định: `<CODEX_HOME>/auth.json`. Nếu không set `CODEX_HOME` thì dùng `~/.codex/auth.json`.

**Trên Windows:**
- Nếu bật `chatgpt.runCodexInWindowsSubsystemForLinux` → dùng `~/.codex/auth.json` phía WSL.
- Nếu tắt → dùng path Windows local.

> Mục đích: tránh import từ môi trường này nhưng switch ở môi trường khác.

---

## 5. Tách state theo CODEX_HOME

Extension có thể tách state active profile theo `CODEX_HOME` mà VS Code được mở. Hữu ích khi chạy nhiều cửa sổ VS Code với các tài khoản Codex khác nhau.

- **Bật**: `codexSwitch.codexHome.enabled = true`
- Không thay đổi `CODEX_HOME` của IDE đang chạy — chỉ thay đổi bucket state.
- Mở mỗi cửa sổ VS Code với `CODEX_HOME` mong muốn, ví dụ:
  ```bash
  CODEX_HOME="$HOME/.codex-client-a" code .
  ```
- Nếu `CODEX_HOME` mới chưa có `auth.json` và `codexSwitch.codexHome.inheritDefaultProfileWhenEmpty = true`, extension sẽ bootstrap từ default home active profile.

### Ma trận runtime hỗ trợ

| Runtime                           | Hỗ trợ custom `CODEX_HOME`? |
| --------------------------------- | --------------------------- |
| Native Windows / Linux / macOS    | Có                          |
| Windows + WSL                     | Không (chỉ dùng WSL home)   |
| SSH remote                        | Có (qua `remoteFiles`)      |

---

## 6. Khớp profile (Profile Matching)

Phát hiện trùng lặp theo **identity trước**:

1. So khớp các trường: `chatgptUserId`, `userId`, `JWT sub`.
2. Nếu thiếu → fallback theo tổ hợp `email`, `accountId`, default organization/workspace id.
3. Nếu organization id chỉ tồn tại ở một phía → coi là 2 profile khác nhau (tránh gộp nhầm).

---

## 7. Chế độ lưu trữ (Storage Modes)

`codexSwitch.storageMode`:

| Mode            | Mô tả                                                |
| --------------- | ---------------------------------------------------- |
| `secretStorage` | Token lưu trong VS Code SecretStorage (mặc định).    |
| `remoteFiles`   | Token lưu ở shared remote filesystem (~/.codex-switch/). |
| `auto`          | `remoteFiles` khi SSH, ngược lại `secretStorage`.    |

### Cấu trúc `remoteFiles`:
```
~/.codex-switch/
├── profiles.json                  # metadata
├── profiles/<profile-id>.json     # auth payload
└── active-profiles/<home-id>.json # shared active state
```
- Thư mục: `0700`, file: `0600`.

### SSH Shared Mode
- Active state được đồng bộ từ `auth.json` của home hiện tại + marker active-profile của home đó.
- Nếu auth hiện tại khớp rõ với 1 profile đã lưu → match đó thắng, marker shared được cập nhật.

---

## 8. Khôi phục (Recovery)

Nếu profile metadata còn nhưng auth data bị mất, extension sẽ hỏi:
- Recover từ remote store (nếu có).
- Import từ `auth.json` hiện tại.
- Xoá profile lỗi.

---

## 9. Cấu hình chính

| Setting                                              | Mô tả                                    |
| ---------------------------------------------------- | ---------------------------------------- |
| `codexSwitch.debugLogging`                           | Bật log debug.                           |
| `codexSwitch.activeProfileScope`                     | `global` hoặc `workspace`.               |
| `codexSwitch.storageMode`                            | `auto` / `secretStorage` / `remoteFiles`. |
| `codexSwitch.reloadWindowAfterProfileSwitch`         | Reload extension host (hoặc cả window).  |
| `codexSwitch.statusBarClickBehavior`                 | `cycle` / `toggleLast` / `selector`.     |
| `codexSwitch.codexHome.enabled`                      | Tách state theo CODEX_HOME.              |
| `codexSwitch.codexHome.inheritDefaultProfileWhenEmpty` | Bootstrap từ default khi home rỗng.    |
| `codexSwitch.rateLimitAutoRefreshIntervalSeconds`    | Tần suất refresh limit (mặc định 900s).  |

---

## 10. Auto refresh rate limit

- Mặc định: **15 phút** (900s). Range: 30s – 12h (43200s). `0` = tắt auto, vẫn có nút **Refresh limits** thủ công.
- Refresh **tất cả** profile đã lưu (không chỉ active), kể cả khi window không focus.
- Nếu Codex rotate token trong lúc refresh → auth mới được ghi đè vào đúng profile đó (token cũ không bị khôi phục khi switch).
- Auth chỉ ghi vào credential backend hiện tại (SecretStorage hoặc remoteFiles) — **không bao giờ ghi vào `auth.json` live**.
- Hiển thị tuổi của kết quả + thời điểm refresh tiếp theo bên cạnh mỗi profile.
- Nhiều cửa sổ cùng IDE phối hợp: chỉ 1 cửa sổ chạy check tại 1 thời điểm, không có leader cố định.
- File coordination: `~/.codex-switch/maintenance/v1/` (chỉ chứa lịch + usage, không chứa token/profile).
- Xoá thư mục này khi tất cả IDE đã đóng → chỉ mất cache limits, không mất profile/credentials.
- Nếu không ghi được file coordination → auto refresh tắt, vẫn dùng được nút thủ công.

---

## 11. Phát triển (Development)

- `npm run check` — gate nhanh.
- `npm run check:release` — gate đầy đủ trước khi release.
- Xem chi tiết trong `CONTRIBUTING.md`.

---

## 12. Bảo mật (Security Notes)

- Single-client local → dùng `secretStorage` là an toàn nhất.
- Chỉ dùng `remoteFiles` trên SSH host đáng tin cậy, nơi cần share state.
- Sync `auth.json` dùng cơ chế **temp-file-and-replace** để giảm rủi ro ghi dở.
- Extension **không tạo** file backup xoay vòng kiểu `auth.json.bak.*`.

---

## 13. Workflow gợi ý cho người mới

1. Cài extension → đăng nhập Codex bình thường.
2. Mở **Manage Profiles** → import `auth.json` hiện tại thành profile đầu tiên.
3. Khi muốn thêm account mới → dùng **Prepare for New Login (Chat)**.
4. Click status bar để chuyển nhanh giữa các account.
5. Bật `codexSwitch.codexHome.enabled` nếu chạy nhiều workspace với account khác nhau.
