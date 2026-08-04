# Stitch Ant Design Progress

Last verified: 2026-07-27

## Source of truth

- Project: `BigIn Asset Management`
- Stitch project ID: `11686200964836917081`
- Local design specification: `design/DESIGN.md`
- Mandatory BigIn UI/UX implementation rules: `design/DESIGN_SYSTEM.md`
- Target design-system asset: `assets/cc2d89efc8024a99b09496992df32ec6`
- Target display name: `Operational Excellence System`

## Required visual rules

- Ant Design light theme for an enterprise desktop application.
- Brand primary: `#FF6B00`.
- Primary hover: `#FF8533`; primary active: `#D95A00`.
- Success: `#52C41A`; warning: `#FAAD14`; error: `#FF4D4F`; info: `#007BFF`.
- Page: `#F5F5F5`; inset/table header: `#FAFAFA`; panels/sidebar/header: `#FFFFFF`.
- Main text: `#1F1F1F`; secondary text: `#595959`; disabled: `#BFBFBF`.
- Border: `#D9D9D9`; subtle border: `#F0F0F0`.
- Selected navigation: `#FFF2E6` background with `#FF6B00` text/icon.
- Sidebar and header stay light/white. Do not use a full green, blue, dark, or orange structural sidebar.
- Controls: 32px high, 6px radius. Surfaces: 8px radius.
- Base text: 14px. Weights: 400 and 600. Spacing follows a 4px grid.
- Avatar and user identity stay consistently in the top-right header.

## Locked AppShell contract

Use this contract for every authenticated desktop screen. Do not reinterpret it
per screen.

- Canvas size: `1280 × 1024`.
- Sidebar: fixed `248px`, background `#FFFFFF`, right border `#F0F0F0`.
- Header/title bar: fixed `64px`, background `#FFFFFF`, bottom border
  `#F0F0F0`.
- Main content: background `#F5F5F5`; panels and tables use `#FFFFFF`.
- The header/title bar must not use a separate green, teal, blue, dark, or
  full-orange fill. Breadcrumb/title content may differ, but the header surface
  must remain the same across all roles and screens.
- Active sidebar item: `#FFF2E6` background and `#FF6B00` text/icon.
- Orange is reserved for the current navigation state, the one dominant action,
  active tabs, links/focus, and small brand accents.
- User name, role, and avatar stay in the top-right header. Never put the user
  identity at the bottom of the sidebar.
- Role menus are immutable during restyling:

  - Staff: `Tổng quan`, `Thiết bị`, `Yêu cầu của tôi`, `Lịch sử mượn`.
  - Asset Manager: `Tổng quan`, `Thiết bị`, `Chờ phê duyệt`,
    `Lịch sử mượn`, `Sửa chữa`, `Danh mục`.
  - Admin: preserve the approved Admin navigation and administration/RBAC
    access; never leak these items into Staff or Asset Manager.

## Batch QA gate

A batch is complete only when all checks pass:

1. **Project mapping:** expected label, source ID, position, dimensions, and
   visible/hidden state are verified through Stitch project data.
2. **Source audit:** required Ant tokens and role-menu labels exist; forbidden
   structural colors (`#246B59`, `#173F3A`, dark/green/teal shell classes) and
   foreign-role menu labels do not exist.
3. **Visual audit:** render the exact source returned by Stitch and inspect
   sidebar, header/title bar, content surface, primary action, active menu,
   density, clipping, and avatar placement.

Do not accept an HTTP `200`, an MCP success message, or generated prose as
visual proof. If Stitch merges old CSS or creates a duplicate revision, reject
the result, preserve the good revision, promote it explicitly, and hide the
obsolete instance only after visual verification.

## Phase status

### Phase 1 — Design-system inventory

Completed.

- `assets/7248443879992234394`: incorrect blue `Interlink Digital`; do not apply.
- `assets/9f2480bcef58429ba7f1f3f2fb79c996`: older orange `Operational Excellence`; do not use as the primary target.
- `assets/cc2d89efc8024a99b09496992df32ec6`: selected target.
- Screen `8368202206497187073` is the displayed `DESIGN.md` document, not a mobile application screen. Do not delete it.

### Phase 2 — Update Operational Excellence System

Completed and verified through `list_design_systems`.

- Version increased from `v1` to `v3`.
- Custom/primary seed is `#FF6B00`.
- Secondary override is neutral `#595959`.
- Tertiary/info override is `#007BFF`.
- Green/teal is no longer a primary or structural brand override.

Stitch derives internal Material-style tonal values and rewrites parts of its generated guideline text. Its generated `styleGuidelines` still describes a dark neutral sidebar even when the update prompt explicitly requires a white AppShell. This is a confirmed Stitch-generation limitation, not an accepted design rule. Screen edits must explicitly enforce the visual rules in this checkpoint; do not trust the generated `namedColors.primary` or generated sidebar prose.

### Phase 3 — Pilot screens

Completed and verified.

- Visible promoted instances:

  - `4637c177e0214bb4a6a3195e3b86f352` — `AUTH-01 — Đăng nhập` at `(0, 0)`
  - `deb475171d4541019ead3f5409ee6e6b` — `AUTH-02 — Đăng ký` at `(1440, 0)`
  - `dc3a34445c124a57896d3b7d9baf48fb` — `DASH-01 — Tổng quan nhân viên` at `(0, 1184)`
  - `c6c3f2da813a4688b3b7701961050ebd` — `DASH-02 — Tổng quan quản lý tài sản` at `(0, 2368)`
  - `bbc0ae8de5504b1d884a35f22ccbdb2b` — `DASH-03 — Tổng quan Admin` at `(0, 4736)`

- The first Direct Edit attempt was rejected after rendering because Stitch merged old hard-coded CSS into the new HTML. The exact generated Ant revisions above were promoted instead.
- The obsolete login instance and all three obsolete dashboard instances were
  removed from the working canvas after exact replacement IDs were visually
  verified. The pre-finalize payload backup is
  `.tmp/stitch-automation/ant-canvas-pre-finalize-backup-1785146027276.json`.
- Fresh source renders confirm the pale-orange login, white sidebar/header, `#FFF2E6` selected navigation, `#FF6B00` actions, neutral surfaces, and top-right profile/avatar.
- Static source audit confirms:

  - Staff menu contains only Staff items and has no management/admin items.
  - Asset Manager menu contains approval/assets/repair/category items and no user/RBAC items.
  - Admin retains the administration navigation.
  - No pilot source contains the old structural `#246B59` or `#173F3A` colors.

### Phase 4 — Role batches

Completed.

- Auth/Staff batch:

  - `AUTH-02` was rebuilt through a deterministic Direct Edit snapshot rather
    than a Stitch agent generation. Its dark green panel, green action, and
    44px submit button were replaced by Ant orange-1, `#FF6B00`, and the 32px
    control contract. The registration fields and Vietnamese content were
    preserved.
  - `AST-01`, `BOR-01`, `BOR-02`, `BOR-03`, `BOR-04`, and `BOR-05` have the
    locked white AppShell, exact selected-navigation colors, top-right identity,
    neutral Ant surfaces/borders, and semantic status colors.
  - Final post-reload Staff audit, including `DASH-01`, passed `7/7`;
    exact-source renders were inspected for the dashboard, catalog, request
    list, request detail, history list, and history detail.
  - `BOR-02` required a dedicated main-wrapper width correction so its profile
    was not clipped beyond the 1280px canvas.

- Asset Manager batch:

  - Borrowing/assets screens `BOR-06`, `BOR-07`, `BOR-08`, `BOR-09`, `AST-03`,
    `AST-04`, and `AST-05`, together with `DASH-02`, passed the locked AppShell
    and role-menu audit (`8/8`). Representative exact-source renders include
    the dashboard, rejection dialog, check-in flow, damaged-asset detail, and
    asset forms.
  - Repair screens `REP-01`, `REP-02`, `REP-03`, `REP-04`, and `REP-05` passed
    the locked AppShell and role-menu audit (`5/5`). Exact-source renders verify
    the orange primary action, red error state, right-side completion drawer,
    and selected `Sửa chữa` navigation.
  - Preserved legacy CSS on `REP-03` initially overrode the primary button with
    green. A body-level Ant override now covers both enterprise and legacy
    `.btn-primary`/`.btn-secondary` classes.
  - Final density audit confirms that visible legacy actions using computed
    heights of `34–36px` are normalized to the locked `32px` control height.

- Admin batch:

  - `DASH-03` and user screens `USR-01` through `USR-04` passed the
    AppShell/menu audit (`5/5`). Exact renders verify top-right identity,
    unclipped primary and secondary actions, and 32px input/select/button
    controls.
  - `DEP-01`, `AST-02`, and `BOR-10` passed (`3/3`). Loading skeletons were
    changed from legacy green-gray to neutral `#F0F0F0`; status badges now use
    explicit Ant success, info, warning, and error treatments.
  - `RBAC-01`, `RBAC-02`, `RBAC-03`, and `SYS-403` passed (`4/4`). `SYS-403`
    intentionally has no selected navigation item; the audit now treats this as
    the approved error-page state rather than a failure.
  - Legacy controls using `h-9`, `h-[36px]`, `p-1`, `p-1.5`, `p-2 tooltip`,
    or `px-3 py-1` are normalized to the 32px Ant control contract without
    collapsing icon-plus-text buttons.
  - Additional legacy computed colors were mapped to the approved tokens:
    green-gray skeleton/module colors are neutral or info, primary hover stays
    orange, and status colors are semantic only.

- Final authenticated AppShell audit result:

  - Staff: `7/7`.
  - Asset Manager: `13/13`.
  - Admin: `12/12`.
  - Total: `32/32`.

### Phase 5 — Final audit

Completed for the Stitch desktop prototype.

- The working canvas contains exactly `35` screen nodes after removing the
  three obsolete dashboards; no approved screen ID was lost.
- Final row order:

  - AUTH: `AUTH-01` at `(0, 0)`, `AUTH-02` at `(1440, 0)`.
  - Staff: `DASH-01` at `(0, 1184)`, followed by the Staff flow.
  - Asset Manager: `DASH-02` at `(0, 2368)`, followed by borrowing, asset, and
    repair flows. Modal/drawer states remain on the secondary row.
  - Admin: `DASH-03` at `(0, 4736)`, followed by users, departments, assets,
    borrowing history, and RBAC. `USR-03` was corrected to `(4320, 4736)`.

- Exact computed-style checks confirm:

  - `#FF6B00` primary actions and active navigation.
  - `#FFFFFF` AppShell surfaces and `#F5F5F5` page surface.
  - Correct role-specific menus and top-right identity.
  - 32px buttons/inputs/selects, 6px controls, and 8px surfaces.
  - Semantic success, warning, error, and info colors only.
  - No visible green/teal structural sidebar, header, title bar, dashboard card,
    login panel, or primary action.

- `Operational Excellence System` remains the selected design-system asset.
  The unrelated `Interlink Digital` asset and the displayed `DESIGN.md` document
  remain on the canvas as reference nodes and are not applied to screens.
- This checkpoint verifies fixed `1280 × 1024` desktop Stitch screens.
  Responsive breakpoints and CSS Grid/Flex behavior must be implemented and
  tested later in the Vue frontend; Stitch ordering does not prove frontend
  responsiveness.

### Phase 6 — Structural consistency re-audit

Completed after a second, stricter review on 2026-07-27.

The previous `32/32` result verified the AppShell, menus, and color contract,
but it did not prove that individual page composition was consistent. A
separate exact-source audit now also checks clipping, control geometry, panel
nesting, large chromatic surfaces, heading scale, and legacy green computed
styles.

- User administration:

  - `USR-02` now uses the same `896px` two-column form language as `USR-04`.
    Personal/security fields occupy the main column, role selection occupies
    the secondary column, and both actions remain visible inside the
    `1280 × 1024` frame.
  - `USR-03` now has three principal surfaces: merged profile/contact,
    flattened permissions, and the managed/borrowed asset table. Permission
    summaries use dividers instead of nested cards. Success badges use Ant
    success tokens and the page title is `Chi tiết người dùng`.
  - `USR-04` now uses one bordered form surface. Inner sections are separated
    by spacing/dividers instead of four independent cards. The selected role is
    highlighted from the checked radio state rather than from a fixed list
    position.
  - `RBAC-03` now uses the locked `24/32px` page-heading scale.

- Staff and Asset Manager:

  - `BOR-06` pagination is fully inside the canvas after correcting the
    content-height calculation.
  - Remaining 40px/30px/28px legacy actions on `BOR-01`, `BOR-03`, `BOR-04`,
    `BOR-08`, `AST-02`, and `RBAC-01` were normalized to the 32px control
    contract.
  - `REP-01` no longer exposes the legacy green active-tab color.
  - `AST-04` uses Ant Info blue for the informational QR panel and Ant Success
    green for the `Sẵn sàng` indicator; orange remains reserved for navigation
    and the primary save action.

- Audit interpretation:

  - Hidden `#qr-drawer`/`#crud-drawer` states are intentionally outside the
    viewport and are excluded only after their visible list/detail states were
    rendered and inspected.
  - Textareas are content-sized controls, not 32px single-line controls.
  - `AUTH-01` has 32px bordered input containers; the inner borderless input
    and visibility icon compute to 30px because they sit inside the 1px border.
  - Large pale red surfaces on `BOR-07`/`REP-05`, large KPI values, and the
    `SYS-403` illustration are approved semantic/content states rather than
    structural-color failures.

- Final post-reload structural result:

  - No visible off-canvas operational region or action.
  - No visible legacy green/teal computed style.
  - No unintended H1 above the approved page scale.
  - Canvas flow positions remain ordered: Auth, Staff, Asset Manager (including
    secondary modal/drawer row), then Admin.

### Phase 7 — Local design documentation handoff

Completed on 2026-07-27.

- The visual source of truth is now `design/DESIGN.md`; the former
  frontend-local copy has been removed.
- The repository-wide architecture and implementation-status source is
  `design/SYSTEM_DESIGN.md`.
- Future frontend work must read both files before translating Stitch screens
  into Vue. A Stitch prototype is not evidence that its Vue route, API contract,
  authorization, responsive behavior, or automated tests are implemented.

### Phase 8 — Full Design System compliance audit

Completed on 2026-07-27 as a read-only Stitch review.

- All 34 current application screens were reloaded from Stitch and checked by
  source, computed desktop render, and visual inspection.
- Desktop visual consistency remains strong: no rendered green structural
  shell, no off-canvas actions, correct role navigation, and consistent
  top-right identity placement.
- The screens are not yet strictly compliant with `design/DESIGN_SYSTEM.md`.
  Systemic gaps include font weight 500, missing semantic H1 elements,
  inaccessible form labels, legacy source tokens, and five 12-column source
  layouts.
- `AUTH-02` is the main visible outlier. Responsive behavior and complete UI
  states remain frontend implementation work rather than proven Stitch
  behavior.
- The data-table audit found 19 tables across 18 screens. The local contract is
  explicit (`#FAFAFA` header, `#F0F0F0` divider, 14/600 header, 14/400 row),
  but Stitch sources still mix `#F7F8FA`, `surface-variant`,
  `border-outline-variant`, and legacy table classes. This is a real source
  consistency gap, not just a visual impression.
- The complete per-screen evidence and repair order are recorded in
  `design/STITCH_DESIGN_SYSTEM_AUDIT.md`.

### Phase 9 — Data-table source normalization

Completed on 2026-07-28 through Stitch `edit_screens` in four desktop batches.

- Normalized the 19 data tables across 18 application screens.
- Table header: `#FAFAFA`, `#1F1F1F`, 14px/600, normal case.
- Table body: 14px/400, primary `#1F1F1F`, secondary `#595959`.
- Cell spacing: 12px vertical and 16px horizontal.
- Dividers: 1px `#F0F0F0`; hover/selected: neutral `#FAFAFA`.
- Table/pagination surfaces: `#FFFFFF`; heavy table shadows removed.
- Existing status semantics, role navigation, labels, workflow and desktop
  composition were preserved.
- Stitch returned `project.file_update` events for every selected batch. The
  source screen count remained unchanged during the table edits.

### Phase 10 — Design-system asset import gate

The local [`design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md) remains the
canonical implementation source. The existing Stitch asset
`assets/cc2d89efc8024a99b09496992df32ec6` is the selected orange asset, but its
stored prose still contains a few legacy statements that conflict with the
local contract. A canonical Markdown upload was accepted as a temporary
`DESIGN.md` screen, but Stitch rejected `create_design_system_from_design_md`
with `Request contains an invalid argument`; it was therefore not applied to
the screens. Do not apply the green asset or the older `Operational Excellence`
asset. The temporary upload must be hidden/removed in Stitch before treating
the asset-import gate as complete.
