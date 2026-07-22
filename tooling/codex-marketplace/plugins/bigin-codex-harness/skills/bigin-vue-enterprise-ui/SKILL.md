---
name: bigin-vue-enterprise-ui
description: Build or review work-focused enterprise interfaces in the BigIn Vue 3 and Vite frontend. Use for Vue views, layouts, feature components, forms, tables, navigation, responsive behavior, visual consistency, or requests to apply Astryx-style enterprise design without migrating the app to React.
---

# BigIn Vue Enterprise UI

Build the actual application workflow, not a marketing page. Treat Astryx as a
design reference and keep Vue as the runtime framework.

Read [references/enterprise-ui.md](references/enterprise-ui.md) before designing
a new page, layout, or reusable visual primitive.

## Workflow

1. Inspect `App.vue`, the router, active layout components, adjacent views, and
   existing CSS before choosing a page structure.
2. Identify the user role, primary task, data density, available actions, and
   required loading, empty, error, forbidden, and success states.
3. Establish the application frame and content regions before styling records.
4. Keep route concerns in `views/`; extract reusable domain UI into
   `components/<feature>` and generic primitives into `components/common`.
5. Put HTTP transport in `services/`, shared state in Pinia stores, and reusable
   stateful behavior in `composables/`.
6. Use Vue 3 Composition API and the existing JavaScript conventions. Do not
   introduce a frontend TypeScript migration as a side effect.
7. Reuse the existing icon library when available. Discuss a dependency before
   adding a new icon package.
8. Run `pnpm build:frontend` and inspect responsive behavior before completion.

## Implementation Rules

- Do not install React, StyleX, or `@astryxdesign/core` in this Vue app.
- Do not call `fetch` directly from a view when a service can own the endpoint.
- Avoid nested cards, card-per-row data displays, oversized headings, decorative
  gradients, and generic dashboard filler.
- Use tables or lists for comparable records and cards only for genuinely
  framed tools or repeated summaries.
- Use semantic HTML, labels, keyboard interactions, visible focus, and adequate
  contrast.
- Keep controls feature-complete: disabled and pending states, validation,
  confirmations for destructive actions, pagination/filter state when needed.
- Keep component dimensions stable so dynamic labels and loading indicators do
  not shift the surrounding layout.

## Completion Check

Verify that the primary workflow is discoverable without explanatory copy,
text fits at mobile and desktop widths, actions use appropriate controls and
icons, all data states exist, and the page remains consistent with surrounding
routes.
