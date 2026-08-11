# Registration Administration Stitch Redesign Implementation Plan

## Objective

Edit three existing Stitch screens in place so their information architecture,
interaction meaning, and visual language match the approved design spec without
changing their IDs, canvas positions, backend contract, or production frontend.

## Inputs

- Approved design spec:
  `docs/superpowers/specs/2026-08-11-registration-administration-stitch-redesign-design.md`
- Stitch project: `11686200964836917081`
- Operational Excellence System palette asset:
  `assets/cc2d89efc8024a99b09496992df32ec6`
- BigIn design sources: `design/DESIGN.md` and `design/DESIGN_SYSTEM.md`

## Verified constraints

- `RoleSummary` has no `updatedAt`; omit the Updated column.
- Approval accepts `departmentId` and optional `roleIds`.
- Omitting `roleIds` resolves the default configured role, falling back to
  `employee`; explicit empty arrays are rejected by controller validation.
- Role Create/Detail/Edit remains the existing flow at Stitch source
  `0e574f09c51a46daae829f30c75372d7` and frontend `RoleFormView`.
- No role deletion, permission CRUD, department CRUD, bulk registration approval,
  or new analytics.

## Execution strategy

1. Capture current title, ID, screenshot metadata, and canvas position for each
   target.
2. Edit screens sequentially so each request has one unambiguous page template.
3. Keep each existing screen ID and title; do not create replacement screens.
4. Preserve the English-cluster canvas row.
5. Re-fetch each target after editing and visually inspect its screenshot.
6. If Stitch unexpectedly returns a replacement instead of updating the target,
   stop the replacement path and use the Brave screen editor to apply the approved
   source to the original target before continuing.

## Task 1 — Role List

Target: `64e21081d5e243208ad361e4b496e59e`

- Render the BigIn white AppShell with Administration and Roles active.
- Add page title, description, and one orange `Create Role` CTA.
- Add one flat white data panel with role search, System/Custom filter, result
  count, populated table, and pagination/total footer.
- Use columns Role, Type, Permissions, Assigned Users, Action.
- Do not show Updated, mock timestamps, Delete, or permission-edit controls.
- Make `Create Role` and `Open` imply navigation to the retained existing Role
  Create/Detail flow.
- Include meaningful loading, empty, and error treatments without blanking the
  page.

Verification: original ID/title, populated first viewport, no Updated/Delete,
one orange CTA, and approved shell/palette.

## Task 2 — Registration Requests

Target: `9884061c33ae48158e15925b1781c2b0`

- Render the shared AppShell with Registration Requests active.
- Add page title, purpose, and a compact pending-count treatment.
- Add one populated data panel with search, Pending/Approved/Rejected segmented
  filter, result count, refresh, table, and pagination.
- Use columns Applicant, Phone, Submitted, Status, Reviewed By, Action.
- Applicant includes initials avatar, name, and email.
- Pending rows use `Review`; terminal rows use `View`.
- Keep empty/error states inside the panel; do not leave a blank page.

Verification: original ID/title, populated first viewport, correct actions and
status semantics, no unsupported KPI/bulk approval, and visual consistency with
Role List.

## Task 3 — Registration Approval Detail

Target: `f9d37a6af05c4ca39c3dd4b81e5297b4`

- Render the shared AppShell with Registration Requests active.
- Add breadcrumb and request identity/status in the page header.
- Use a 16+8 desktop grid.
- Main column contains Applicant Summary, Registration Context, and Account Impact.
- Account Impact explicitly says the backend assigns the default Employee role
  when no initial role is selected.
- Decision panel contains required Department, optional multi-role selection,
  selected count, visible fallback copy, impact preview, Reject, and one orange
  `Approve & Create User` CTA.
- Represent Reject as a danger confirmation/modal with optional reason.
- Terminal outcome removes mutation actions and shows audit plus created-user or
  rejection details.

Verification: original ID/title, populated applicant and decision panels in the
first viewport, correct fallback copy, no second primary CTA or invented fields.

## Final verification

1. Re-fetch all three screens by their original IDs.
2. Download and inspect final screenshots side by side.
3. Confirm canvas positions remain:
   - Role List: `(25858, 15371)`
   - Registration Requests: `(27202, 15371)`
   - Registration Approval Detail: `(28546, 15371)`
4. Confirm visible titles remain searchable.
5. Compare palette and shell against the approved spec and existing English
   Administration references.
6. Do not mark any blank or partial screen complete.
