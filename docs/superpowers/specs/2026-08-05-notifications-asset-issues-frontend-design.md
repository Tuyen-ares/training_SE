# Notifications and Asset Issues Frontend Design

## Scope

Implement the Vue frontend for F06 Asset Issues & Repair and F07 Notifications. The implementation consumes the existing backend APIs and does not change the database, backend contracts, requirements, or Stitch screens.

Visual sources, in priority order:

1. MVP requirements and current backend API behavior.
2. BigIn `DESIGN_SYSTEM.md` and `DESIGN.md`.
3. Stitch screens `d81414cd5fad454cbf2e23ededcdb0a3`, `dd2afb2fd6614c3cbf5ad30d22f0c7f8`, `ccae28a828484caa98c78233735ca186`, and `fb67123be79946079c7f98c8eec80f58`.

## Architecture

Use two route-level areas:

- `/notifications` for the authenticated user's Notification Center.
- `/asset-issues` and `/asset-issues/:id` for issue list and issue detail.

Start Repair, Complete Repair, Failed Repair, and invalid-state feedback are workflow states inside Issue Detail. They are not separate routes. This keeps the operational context visible and avoids duplicating the application shell.

HTTP calls live in dedicated frontend service modules and use `authStore.api`, which is backed by Axios and the existing refresh-token behavior. Views only coordinate state and presentation.

## Notification Center

The Notification Center provides:

- All and Unread tabs.
- Unread count.
- Time-ordered notification list with type, title, message, read state, and created time.
- Mark one notification as read.
- Mark all notifications as read.
- Open the related entity when the logical reference maps to a supported route.

Supported logical mappings initially include:

- `BORROW_REQUEST` to the request detail available to the current user.
- `ASSET_ISSUE` to Asset Issue Detail when the current user has issue-view permission.

An unsupported, missing, or forbidden entity does not break the list. The UI shows safe feedback instead.

The persistent header bell displays the unread badge and navigates to Notification Center. The sidebar Notifications item also receives a real route.

## Asset Issues & Repair

### Issue List

The list uses a table suitable for operational comparison. It includes issue ID, asset/model, reporter, current status, created time, handler, and a View Details action. Filters include issue status and asset ID where useful. Pagination is server-driven.

The screen is available only with `asset_issue.view`. Navigation and routes use effective permission codes rather than role names.

### Issue Detail

Issue Detail follows the Repair Details Stitch composition:

- Compact page heading with issue ID and status.
- Information panel for asset, reporter, handler, dates, repair provider, cost, result, and notes.
- Timeline derived from currently persisted lifecycle timestamps and status; it does not invent unsupported audit events.
- Contextual actions displayed only when both permission and issue status allow them.

Actions:

- `REPORTED`: Confirm or Reject for `asset_issue.update`.
- `CONFIRMED`: Start Repair for `asset_issue.create`.
- `IN_REPAIR`: Update Progress for `asset_issue.update`; Complete or Mark Failed for `asset_issue.close`.
- Terminal states: read-only.

Start Repair, Update Repair, Complete Repair, and Failed Repair use focused Ant Design modals based on the fields supported by the backend: repair provider, dates, cost, result, and notes. They remain workflow states of Issue Detail rather than separate routes.

Invalid transitions returned as HTTP 409 render a visible Ant Design error alert and reload the issue. This represents the Cannot Start Repair mockup without creating an artificial page.

## Visual Rules

- Persistent white sidebar and white header from `WorkspaceLayout`.
- Page background `#F5F5F5`, white work surfaces, 8 px panel radius.
- BigIn primary action `#FF6B00` through Ant Design tokens.
- Status uses semantic Ant Design tags and alerts, never color alone.
- Only one dominant primary action per decision region.
- English UI copy throughout.
- No mockup identifiers such as `REP-02` appear in runtime headings.

## Data States and Error Handling

Both areas include stable loading states, retryable load errors, empty states, pagination state, mutation pending/disabled state, and success feedback.

403 and 404 responses use safe Result patterns. The UI never exposes resource details that the current user cannot access. Mutation errors retain form input where possible.

## Verification

- Frontend production build passes.
- Routes reject users without the required effective permissions.
- Header and sidebar remain persistent during navigation.
- Notification ownership is preserved by the backend and reflected in the UI.
- Issue actions match the current status and permission matrix.
- Desktop visuals are compared with the four Stitch references.
- Narrow viewport behavior is checked for table overflow, drawers, and action wrapping.

## Out of Scope

- New backend endpoints or schema changes.
- Email, SMS, push notifications, scheduling, or notification preferences.
- Separate routes for Start Repair, Complete Repair, or error variants.
- Invented asset lifecycle/audit history not present in the API.
