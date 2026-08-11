# Registration Administration Stitch Redesign

## Goal

Redesign three existing Stitch screens in place so they use BigIn's Ant Design
visual language, present meaningful operational data, and support the approved
registration-review and role-management workflows.

The existing screen IDs and canvas positions remain stable:

| Screen | Stitch screen ID |
| --- | --- |
| Role List | `64e21081d5e243208ad361e4b496e59e` |
| Registration Requests | `9884061c33ae48158e15925b1781c2b0` |
| Registration Approval Detail | `f9d37a6af05c4ca39c3dd4b81e5297b4` |

The screens stay in English because they belong to the English reference cluster.

## Source of truth

The redesign follows these sources in order:

1. registration-review and RBAC requirements and business rules;
2. `design/DESIGN.md` and `design/DESIGN_SYSTEM.md`;
3. current API contract and backend behavior;
4. existing English BigIn screens as composition references;
5. Operational Excellence System as a color-palette reference only.

The Operational Excellence System must not supply the shell, page layout,
typography, card treatment, table density, or elevation model.

## Verified backend fallback

Approval accepts `{ departmentId, roleIds? }`. The controller allows `roleIds` to
be omitted and rejects an explicitly supplied empty array. The registration
service passes the optional value to `RbacService.resolveInitialRoleIds()`. When
the value is absent, that service resolves `DEFAULT_REGISTER_ROLE_NAME`, falling
back to `employee` when the environment variable is not configured.

This behavior is covered by the RBAC service test for missing role input and is
also recorded in the API contract. The detail screen may therefore show:

> Employee will be assigned by default when no initial role is selected.

The frontend must omit `roleIds` rather than send an empty array when the reviewer
uses the fallback.

## Visual contract

### Palette

| Purpose | Token/value |
| --- | --- |
| Primary and brand | `#FF6B00` |
| Secondary text/icon | `#595959` |
| Informational link/accent | `#007BFF` |
| Primary text | `#1F1F1F` |
| Page background | `#F5F5F5` |
| Panel surface | `#FFFFFF` |
| Inset/table header | `#FAFAFA` |
| Default border | `#D9D9D9` |
| Subtle divider | `#F0F0F0` |
| Success | `#52C41A` |
| Warning | `#FAAD14` |
| Error | `#FF4D4F` |

Orange is reserved for the primary CTA, active navigation/tab, focus state,
links that use the primary interaction treatment, and small brand accents. Blue
may be used for ordinary informational links. Semantic colors communicate status
only and always appear with text or an icon.

### BigIn Ant Design language

- White 248px sidebar with a light right border.
- White 64px header with breadcrumb/context on the left and user identity on the
  right.
- Neutral page background with 24px desktop content padding.
- Flat white panels, 8px surface radius, light borders, and minimal shadow.
- Controls are 32px high with 6px radius.
- One 24/32px, weight-600 page title per screen.
- Body and table text use 14/22px; supporting metadata uses 12/20px.
- No dark structural shell, gradients, glass treatment, deep shadows, or large
  orange surfaces.

All screens use one Administration navigation item and the horizontal tabs Users,
Registration Requests, and Roles. The active tab uses orange text and underline.

## Screen 1: Role List

### Purpose

Allow a permitted administrator to find existing roles, understand their type
and reach, and open or create a role. Role deletion is not supported.

### Layout

1. Shared AppShell and Administration tabs.
2. Page header with title `Roles`, a one-line description, and the single primary
   action `Create Role` when the user has `role.create`.
3. One white data panel containing:
   - search by role name;
   - System/Custom type filter;
   - result count and optional refresh icon;
   - a dense Ant table;
   - pagination or total count footer.

### Table columns

- Role: role name as the primary identifier.
- Type: neutral or informational `System`/`Custom` tag.
- Permissions: numeric count.
- Assigned users: numeric count.
- Action: `Open` informational link.

The current `RoleSummary` API returns only `id`, `name`, `isSystem`,
`permissionCount`, and `userCount`. It does not return `updatedAt`, so the Stitch
table must not contain an Updated column or mock update timestamps.

The mockup contains representative rows for Administrator, Asset Manager,
Employee, and Quality Auditor so the table structure is visually meaningful.
There is no Delete action.

`Create Role` and `Open` lead to the retained existing Role Create/Detail flow,
represented by Stitch source `0e574f09c51a46daae829f30c75372d7` and the shared
frontend `RoleFormView`. Create mode accepts a name and permission set. Detail
mode supports custom-role rename and permission replacement; system role names
remain protected. That flow is outside this three-screen visual redesign and is
not undefined or newly introduced by these actions.

## Screen 2: Registration Requests

### Purpose

Help a reviewer find pending work first while retaining access to approved and
rejected history.

### Layout

1. Shared AppShell and Administration tabs.
2. Page header with title `Registration Requests`, description, and a compact
   pending-count status treatment. It does not add unsupported analytics.
3. One white data panel containing:
   - search by applicant name, email, or phone;
   - segmented status filter for Pending, Approved, and Rejected;
   - active result count and refresh;
   - request table;
   - pagination and total count.

### Table columns

- Applicant: initials avatar, full name, and email.
- Phone.
- Submitted.
- Status.
- Reviewed by: `—` while pending.
- Action: `Review` for pending requests and `View` for terminal requests.

Pending data is presented oldest first. Approved and rejected history is newest
first. The representative dataset includes multiple pending applicants plus one
terminal-state example so status and action differences are clear.

### Empty and error states

An empty state stays inside the data panel and distinguishes no pending requests
from no filter results. Recoverable load errors use an inline alert with Retry and
preserve filter values. The page must never become a large unexplained blank
surface.

## Screen 3: Registration Approval Detail

### Purpose

Give the reviewer enough context to make one safe decision and preview the user
account that approval will create.

### Layout

The desktop content uses a 16+8 Ant grid after the breadcrumb and page header.

#### Main column

1. `Applicant Summary` panel:
   - initials/avatar;
   - full name;
   - email;
   - phone;
   - submitted date/time.
2. `Registration Context` section:
   - request ID;
   - current status;
   - submitted timestamp;
   - reviewer and reviewed timestamp when terminal.
3. `Account Impact` info alert or bounded section explaining that approval creates
   an active user, allocates a userCode, assigns the selected department and roles,
   links the created user, and completes the request atomically. It must explicitly
   state that when no initial role is selected, the backend assigns the default
   Employee role.

Readonly applicant and audit data use descriptions, not disabled form inputs.

#### Decision column

One `Approval Decision` workflow panel contains:

- required Department searchable select;
- Initial Roles multi-selection using meaningful checkbox/selection rows with
  role name, System/Custom metadata, and a short description when available;
- selected-role count;
- the verified employee fallback copy when no role is selected;
- an impact summary showing the chosen department and roles before approval;
- an action footer with `Reject` as a danger-outline action and
  `Approve & Create User` as the only orange primary action.

### Reject interaction

Reject opens a 520px confirmation modal. It identifies the applicant, explains
that no user will be created and the applicant can submit again later, and offers
an optional rejection-reason textarea. The action order is Cancel then danger
`Reject Request`.

### Terminal outcome

Approved and rejected requests replace the editable decision panel with `Review
Outcome`. It shows reviewer, review time, created user link for approval, or the
optional rejection reason for rejection. Terminal requests expose no mutation
actions.

## Data and interaction flow

1. Reviewer opens Registration Requests with Pending selected by default.
2. Search/status/pagination update the table without losing context.
3. Review opens the detail screen with the request identity in the breadcrumb.
4. Approval requires a department. Role selection is optional because the API
   supports the employee fallback.
5. The UI omits `roleIds` when using the fallback and sends selected IDs otherwise.
6. Approve and reject enter a loading state and prevent double submission.
7. Success refetches/replaces the request with its terminal outcome.
8. Failure keeps the request pending, preserves inputs, and displays an actionable
   inline error.

Authorization remains based on `user_registration.review`; role names do not
authorize the workflow.

## Required states

Each data-driven screen includes:

- skeleton loading that preserves the final geometry;
- empty state with a clear explanation and relevant next step;
- inline recoverable error with Retry;
- forbidden handling without rendering sensitive applicant data;
- mutation loading and disabled controls;
- terminal success/outcome state;
- stale/partial warning if old data is retained after refresh failure.

## Responsive behavior

- Desktop uses the full white AppShell and 24px content gutter.
- Tablet wraps toolbars and may reduce secondary table columns.
- Mobile uses drawer navigation, a single-column detail flow, and a mobile list or
  horizontally scrollable table with applicant/action priority preserved.
- The approval actions remain visible without covering content.
- Modal and selection controls fit the viewport with at least 16px side space.

## Accessibility

- Every input has a visible label and associated validation message.
- Status is never represented by color alone.
- Selection rows maintain checkbox state, selected border, and selected background
  together.
- Focus order follows the visual order and focus-visible uses the orange focus
  treatment.
- Icon-only controls have accessible names and tooltips.
- Approve/reject feedback is announced and modal focus is trapped/restored.

## Non-goals

- No role deletion.
- No permission creation or editing from the Role List.
- No department CRUD.
- No bulk registration approval.
- No invented KPI dashboard, charts, or registration analytics.
- No authorization based on the names Administrator, Asset Manager, or Employee.
- No change to the screen IDs, canvas grouping, backend contract, or production
  frontend in this Stitch-only redesign.

## Stitch review checklist

- The three target IDs are edited in place and remain beneath the English cluster.
- Shared shell geometry and Administration tabs match across all three screens.
- Both registration screens show meaningful cards/table content in the first
  viewport and never render as blank canvases.
- Palette follows Operational Excellence System swatches while composition follows
  BigIn Ant Design.
- There is one orange primary CTA per region.
- Registration detail visibly supports department, role selection, employee
  fallback, approve, reject, and terminal outcome.
- Loading, empty, error, and terminal states are represented in the screen design
  or clearly attached workflow variants.
