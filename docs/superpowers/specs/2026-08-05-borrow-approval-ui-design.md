# Borrow approval UI refresh

## Scope

Refresh the admin/manager Borrow Request experience to match Stitch screen
`71f82fde9f814b1ba1ac58836343dc52` (Approval Details). Only
`ApprovalQueueView.vue` and `ApprovalDetailView.vue` presentation/layout are in
scope. No API, service, permission, state transition or business rule changes.

## Design

- Keep the existing WorkspaceLayout and English labels.
- Use a compact page header with back navigation, request identifier, status and
  creation metadata.
- Present requester summary and decision guide as aligned summary panels.
- Present requested assets as a dense, scannable table/list with asset identity,
  serial/QR, expected return, stock status, approval status and actions.
- Keep Approve, Reject, Approve All and Confirm Handover actions wired to the
  existing handlers and permission checks.
- Use stable loading skeletons, retryable error state, empty queue state,
  disabled/pending mutation states and responsive horizontal scrolling or
  stacked rows at narrow widths.
- Preserve existing status colors and use text labels in addition to color.

## Verification

- Run `pnpm build:frontend`.
- Inspect desktop and narrow viewport layouts through the running Vue app.
- Confirm no network/service files changed and existing action handlers remain
  the only mutation path.
