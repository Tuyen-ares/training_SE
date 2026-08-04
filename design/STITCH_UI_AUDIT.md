# Stitch UI Audit — Ant Design / BigIn

Last updated: 2026-07-28

## Locked contract

- Page canvas: `#F5F5F5`; sidebar, app header, title bar, panels, table body
  and pagination: `#FFFFFF`.
- Inset/table header: `#FAFAFA`; component border: `#D9D9D9`; table divider:
  `#F0F0F0`.
- Primary: `#FF6B00`; hover: `#FF8533`; active: `#D95A00`.
- Controls: `32px` high, `6px` radius. Panels and tables: `8px` radius, no
  static shadow. Typography: Inter, base `14px`, weights `400` and `600`.
- Tables/grids: normal-case header `14px/600`, row `14px/400`, cells
  `12px × 16px`, text-bearing status, and a right-aligned stable action column.

## Completed live screen batches

1. `AST-01`, `BOR-04`, `BOR-05`, `BOR-10`
2. `BOR-06`, `AST-05`, `REP-01`, `AST-02`, `BOR-07`
3. `USR-03`, `RBAC-01`, `RBAC-02`, `RBAC-03`, `DASH-03`, `USR-01`, `DEP-01`

Each batch was sent as an in-place edit against its canonical source screen.
The returned Stitch DOM operations explicitly replaced legacy table/filter/
pagination surfaces, dividers, row density, and control heights with the
contract above.

`BOR-05` was corrected separately and now has the visible H1 **Chi tiết lịch
sử mượn**. Its content is completed borrowing history: asset and borrower
identity, loan/return dates, return condition, return note, and a
borrowing/return timeline. Approval and reject actions were removed.

## Persisted canvas verification

The persisted project map was checked after cleanup:

- all `35` canonical codes in `STITCH_SCREEN_MAP.md` are present exactly once;
- no canonical code is missing or duplicated;
- all application screens retain `1280 × 1024` canvas dimensions;
- the two generated, unlabelled duplicate screen nodes created during the
  content edits were removed with an atomic canvas save (`HTTP 200`);
- the two Design System reference nodes remain intentionally visible and are
  not application screens.

## 2026-07-28 — role-row and table-surface correction

- Canvas is ordered horizontally by role: Auth/documentation, Staff, Asset
  Manager (including all Repair screens), then Admin. Role rows use a 160px
  gap between `1280 × 1024` application screens.
- The full 18-screen table/grid inventory was normalized again with explicit
  source colors. Table wrappers, body rows, empty states, and pagination are
  `#FFFFFF`; headers only are `#FAFAFA`; dividers are `#F0F0F0`.
- `BOR-10` was explicitly included because its table body had kept a gray
  background. Its table panel/body/pagination now use `#FFFFFF`.

## Forbidden values

Do not reintroduce these into structural AppShell, panel, or normal table
styles:

- teal/green/blue/dark/orange structural sidebar, header, or title bar;
- `#CBD5D1`, `#F7F8FA`, or `surface-variant` as a normal table/body surface;
- uppercase `12px` table headers, `8px` table row padding, zebra rows, or
  static table/panel shadows.

## Stitch asset caveat

The selected `Operational Excellence System` asset is still the orange target,
but Stitch rejected `update_design_system` with `Request contains an invalid
argument` for both minimal and full asset payloads. The direct screen edits
therefore carry the canonical contract while this connector issue remains.
Before using Stitch's Design System UI to regenerate further screens, reopen
the asset and reconcile its generated prose with this document and
`DESIGN_SYSTEM.md`; do not apply the legacy blue or green assets.
