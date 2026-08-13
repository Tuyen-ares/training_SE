# Registration Administration — Ant Design Workspace Redesign

## Decision

Redesign the following existing Stitch screens in place using approach A: a
high-density Ant Design workspace that matches the established English BigIn
mockups, especially `System Borrowing History - BigIn Asset (English)`
(`7880cfa8838c4d9c8db678f6b07c376d`).

| Screen | Stitch screen ID |
| --- | --- |
| Role List | `64e21081d5e243208ad361e4b496e59e` |
| Registration Requests | `9884061c33ae48158e15925b1781c2b0` |
| Registration Approval Detail | `f9d37a6af05c4ca39c3dd4b81e5297b4` |

The screens remain in English and stay in their existing English-screen cluster.
Role Create and Role Detail/Edit are retained existing flows outside this
three-screen redesign. No target screen may imply delete-role support.

## Sources of truth

1. `docs/contracts/registration-review-and-role-management.md` and the active
   registration/RBAC requirements;
2. current backend DTOs and frontend views;
3. existing English BigIn operational mocks, chiefly `7880...`;
4. the `Ant-Industrial Precision` Stitch design system for layout and Ant Design
   component conventions;
5. the Operational Excellence System only for palette tokens.

Operational Excellence must not introduce its dark sidebar, its page treatment,
or non-BigIn typography/layout into these screens.

## Shared visual contract

- White 248px persistent sidebar with a `#F0F0F0` right border; compact BigIn
  Asset logo at the top; Administration is the active navigation item with a
  soft `#FFF2E6` fill, orange text, and a 3px orange edge accent.
- White 64px top header with contextual breadcrumb/title at left and notification
  plus avatar/profile controls at right. Do not add decorative header content.
- `#F5F5F5` page background, 24px desktop page padding, a 4px spacing rhythm,
  16px grid gutter, Inter typography, 14px default control/table text.
- Panels are white with a 1px `#D9D9D9` border, 8px radius, and no static shadow.
  Tables use `#FAFAFA` headers, compact 12px vertical / 16px horizontal cells,
  and `#F0F0F0` row dividers.
- Inputs and buttons are 32px with a 6px radius. Orange `#FF6B00` is reserved
  for one primary CTA per region, active navigation, and focus. Blue `#007BFF`
  is for ordinary informational links. Statuses use semantic colors only.
- Administration secondary tabs sit directly below the header: Users,
  Registration Requests, Roles. Their active state uses orange text/underline,
  not a large filled tab.
- No gradients, dark shell, oversized headings, deep shadows, card-per-row
  layout, dashboard metrics, unsupported analytics, or blank decorative space.

## Screen 1 — Role List

### Purpose and data

The page supports finding a role, assessing its scope, creating a new role, and
opening the retained Role Detail/Edit flow. The role summary API supplies only
`id`, `name`, `isSystem`, `permissionCount`, and `userCount`; it has no
`updatedAt`, so Updated is omitted.

### Layout and controls

1. Compact page heading: `Roles`, a short scope sentence, and right-aligned
   orange `Create Role` when the viewer has `role.create`.
2. One meaningful white table panel. Its top toolbar contains an Ant search
   input (`Search roles`) and a compact local `All / System / Custom` filter.
   The filter is visualized as client-side filtering because roles are fetched as
   one summary collection; it does not pretend to be a separate backend query.
3. Dense table: `Role`, `Type`, `Permissions`, `Assigned users`, `Action`.
   Role name is the primary scan target; Type is a neutral `System` or `Custom`
   tag; numeric columns are right aligned. The action is blue `View & edit`, not
   a destructive or overflow action.
4. The panel footer shows the result count. No mocked update time, no delete,
   and no fabricated permission-description data in the list.

Representative rows use the actual model shape: Administrator, Asset Manager,
Employee, and Quality Auditor with permission and assigned-user counts.

## Screen 2 — Registration Requests

### Purpose and data

The queue prioritizes pending registration work but retains terminal history.
It displays DTO-supported values only: applicant name/email, phone, submitted
time, status, reviewer when present, and terminal outcome context.

### Layout and controls

1. Compact page heading: `Registration Requests` and a short operational
   description. It has no unsupported KPI tiles.
2. One white table panel. The top row has a search input for name, email, or
   phone. Directly below it, Ant tabs filter `Pending`, `Approved`, and
   `Rejected`; Pending is active by default. A small count is shown in the tab
   label or beside the results, never as a large statistic card.
3. Dense table: `Applicant`, `Phone`, `Submitted`, `Status`, `Reviewed by`,
   `Action`. Applicant is two-line (name then subdued email); Submitted is
   compact date/time; status is a semantic tag.
4. Pending rows have a compact orange `Review` button because it starts the
   primary workflow. Approved and rejected rows use blue `View` because they are
   read-only. Row hover is subtle; clicking the identity or action opens the
   separate Approval Detail screen.
5. The panel footer holds total/pagination. Empty, loading, and retry-error
   states remain inside this panel so the page never appears as an empty canvas.

Ordering follows the API: Pending oldest-first; Approved/Rejected newest-first.

### Responsive and refresh behavior

- At narrow widths the search input remains compact (up to 280px) and shares a
  row with the refresh control; the pending count may wrap to its own line.
  The table remains the dominant surface and scrolls horizontally inside its
  own Ant Design table container when needed.
- Refresh is an explicit re-fetch of the queue and pending count. The screen
  does not use polling, WebSocket, or server-sent events; a newly submitted
  request becomes visible on the next load, search, status change, pagination
  action, or refresh.

## Screen 3 — Registration Approval Detail

### Purpose and data

This separate screen lets a reviewer make exactly one safe decision for a
pending registration. Approval requires `departmentId`; selected `roleIds` are
optional. If no initial role is selected, the client omits `roleIds` and the
backend assigns its default Employee role. Rejection reason is optional.

### Layout and controls

1. Breadcrumb `Administration / Registration Requests / Request #ID`, followed
   by a compact title row showing applicant name, request number, submitted time,
   and semantic status. A blue `Back to requests` link returns to the queue.
2. One 7/5 operational workspace, not a card grid:
   - **Applicant & request**: one white description panel containing avatar or
     initials, full name, email, phone, request ID, submission time, and current
     status. This data is contiguous rather than split into several empty cards.
   - **Approval decision**: one white workflow panel with required searchable
     Department select, Initial roles multi-select, selected-role count, and a
     visible info alert: `No initial role selected — the default Employee role
     will be assigned.` The roles control uses only `id`, `name`, and
     `isSystem`, the fields actually returned by the roles API.
3. A concise `Account impact` strip within the decision panel says approval
   creates the user, allocates the user code, assigns the chosen department and
   selected/default role, links `createdUserId`, clears the password hash, and
   marks the request terminal in one transaction.
4. The decision panel has a fixed local footer: outlined danger `Reject` on the
   left and the only orange primary `Approve & create user` on the right. The
   approve button is disabled until a department is selected and both mutations
   use a pending state to prevent duplicate handling.
5. Reject opens an Ant confirmation modal with applicant identity, a concise
   warning that no user is created and the password hash is cleared, optional
   reason textarea, `Cancel`, and danger `Reject request`.
6. For Approved/Rejected records the decision panel becomes a read-only
   `Review outcome` panel: reviewer, reviewed time, linked created user for
   approval, or optional rejection reason for rejection. No mutation buttons
   remain.

## Authorization and behavior

- Registration review is gated by `user_registration.review`, not by role name.
- Role List actions reflect `role.view`, `role.create`, and retained Role
  Detail/Edit permissions; role deletion is absent.
- Approve/reject requests are single-use. A conflict or validation failure keeps
  the request pending, preserves the entered department/roles/reason, and shows
  an inline Ant error alert.
- Loading uses skeleton geometry; empty, forbidden, retry-error, mutation
  pending, and terminal outcome states are all represented without changing the
  shell or losing context.

## Acceptance checklist for the Stitch edit

- All three existing IDs are edited in place.
- Sidebar, logo, header, Administration tabs, color usage, control sizes, and
  table density visibly match `7880...` and the Ant-Industrial Precision system.
- Role List has only supported fields and direct non-destructive actions.
- Registration Requests gives Pending work a clear primary Review action and
  history a read-only View action, while preserving the compact narrow-screen
  toolbar and deliberate table scrolling behavior.
- Approval Detail has exactly two meaningful work panels, no card forest, and
  makes the department/default-Employee behavior explicit.
- No target screen introduces role delete, permission authoring, bulk approval,
  or hard-coded authorization by role name.
