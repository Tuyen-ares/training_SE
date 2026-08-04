# Enterprise UI Reference for Vue

This reference adapts Astryx design principles to Vue without copying its React
component implementation.

## Frame First

Choose the application shell before filling the page:

- Persistent global navigation for stable product areas.
- Contextual sidebar only when the current area needs secondary navigation.
- Compact page header with title, status, and primary actions.
- Main content width based on the task: constrained for forms, wider for tables.
- Drawers or dialogs only for focused secondary work that preserves page context.

Do not place the whole page inside a floating card. Full-width page sections
should remain unframed inside a constrained application region.

## Information Density

- Use tables when users compare the same fields across records.
- Use lists when record content varies or scanning order matters.
- Use description lists for entity details.
- Use cards for summary metrics, repeated objects, and framed tools only.
- Keep toolbar filters and bulk actions close to the records they affect.
- Put secondary metadata below or beside the primary identifier, not in a cloud
  of badges.

Use compact but readable spacing. Enterprise does not mean cramped; it means
information hierarchy is predictable and repeated work is efficient.

## Semantic Tokens

Define a small set of CSS custom properties before adding one-off values:

```css
:root {
  --surface-page: #f7f8fa;
  --surface-panel: #ffffff;
  --surface-subtle: #f1f3f5;
  --text-primary: #1f2933;
  --text-secondary: #5f6b7a;
  --border-default: #d8dee6;
  --action-primary: #176b55;
  --status-danger: #b42318;
  --focus-ring: #2f6feb;
  --radius-control: 4px;
  --radius-panel: 8px;
}
```

Adapt values to an existing brand before introducing them. Do not produce a
one-note purple, blue, beige, slate, or orange theme. Use status color only for
meaning and never as the only signal.

## Controls

- Icon buttons: common toolbar actions such as refresh, edit, delete, close,
  navigation, and overflow. Add accessible labels and tooltips.
- Text buttons: explicit commands whose meaning is not clear from an icon.
- Segmented control or tabs: mutually exclusive views or modes.
- Checkbox or switch: binary choices.
- Select or menu: bounded option sets.
- Input, stepper, or slider: numeric and free-form values according to precision.

Reserve the strongest button treatment for one primary action per region.
Destructive actions require explicit wording and confirmation proportional to
their impact.

## Required States

Every data-driven view should account for:

- Initial loading with stable layout.
- Empty data with a relevant next action.
- Recoverable error with retry when appropriate.
- Forbidden or unauthenticated access.
- Partial and stale data when the API can return it.
- Pending mutation that prevents duplicate submission.
- Success feedback that does not obscure the next task.

## Responsive Behavior

- Preserve navigation and primary actions before secondary metadata.
- Allow toolbars to wrap into logical rows.
- Give tables a deliberate small-screen strategy: horizontal scroll, selected
  columns, or a purpose-built list representation.
- Avoid viewport-scaled font sizes. Use stable type sizes and responsive layout
  constraints.
- Check long names, translated labels, validation messages, and empty states for
  overlap.

## Review Checklist

- The user's main task is visible in the first viewport.
- Similar actions look and behave the same across pages.
- Table columns, filters, and status labels use domain language.
- Keyboard focus order follows visual order.
- Focus, hover, disabled, active, and error states are visible.
- Color contrast and hit targets remain usable.
- Decorative UI does not compete with operational data.
