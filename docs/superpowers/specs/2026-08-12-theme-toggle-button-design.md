# Theme Toggle Button Design

## Scope

Add a light/dark theme toggle to the shared workspace header. The existing
Pinia app store remains the source of truth for the theme, and the existing
Ant Design `ConfigProvider` continues to apply the selected algorithm.

## UI behavior

- Place an icon-only button in the workspace header action group, beside the
  notifications action.
- Show the available `BulbOutlined` theme icon in the toggle button.
- Provide a tooltip and dynamic `aria-label` describing the theme that will be
  activated.
- Invoke `appStore.toggleTheme()` on click.

## Out of scope

This change does not refactor existing hard-coded light layout colors or add
backend/API changes. Those are separate dark-mode visual work.

## Verification

Run the repository's frontend build and inspect the final diff.
