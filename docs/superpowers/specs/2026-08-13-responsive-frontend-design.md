# Responsive Frontend — Active MVP Workspace

## Decision

Apply one shared responsive contract to the active authenticated frontend while
preserving desktop information density and existing backend, API, permission,
route, and business behavior. Authentication routes receive overflow regression
coverage only; `views/train/**` and legacy routes are out of scope.

## Breakpoints

| Viewport | Behavior |
| --- | --- |
| `<576px` | Mobile |
| `576–991px` | Tablet |
| `>=992px` | Desktop |

Desktop keeps the existing 296px sidebar (72px collapsed). Mobile and tablet
use the responsive rules below. Boundary checks cover 575/576px, 767/768px,
and 991/992px.

## Shared responsive contract

- The workspace shell and mobile navigation use `100vh` as a fallback and
  `100dvh` as the effective viewport height.
- Below 992px, the sidebar becomes a closed-by-default overlay drawer with a
  backdrop. Its width is `min(296px, 82vw)` so a visible backdrop remains on a
  phone. It closes on route navigation, backdrop click, or `Escape`, and locks
  page scrolling while open.
- Shared z-index tokens order the header, navigation backdrop, navigation
  drawer, popups, and business modals. Modals remain above the navigation.
- Shared classes provide page width containment, responsive action/footer
  wrapping, modal viewport limits, native-table surfaces, and 44px touch
  targets for coarse pointers below 992px.

## Data-dense views

- Multi-column Ant Design tables use native `scroll: { x: 'max-content' }`.
  The shared wrapper is visual containment only; it must not become a second
  horizontal scroll owner.
- The Approval Detail custom asset grid uses one horizontal scroll container
  for both its header and rows. Both share the same grid columns and 960px
  minimum width, preserving column alignment while scrolling.
- Toolbars, forms, descriptions, action groups, pagination, drawers, and
  modals wrap or stack at narrow widths without imposing page-level horizontal
  overflow. Form grids collapse to one column below 768px.
- The Registration Requests search/filter toolbar stays compact on mobile: the
  search field is capped at 280px, refresh remains adjacent, and the pending
  summary may use the next line. Refresh is manual; realtime transport and
  polling are not part of this responsive increment.

## Verification

- `apps/frontend/scripts/responsive-static-audit.mjs` validates the shared
  drawer, dynamic viewport, z-index tokens, table-scroll convention, Approval
  Detail scroll alignment, and disallowed page-level minimum widths.
- Runtime overflow smoke checks compare document/body scroll width with client
  width while excluding permitted table/custom-grid scroll owners.
- The viewport matrix is 320x568, 375x812, 390x844, 575x800, 576x800,
  767x900, 768x1024, 991x900, 992x900, and 1280x900. Dark mode and auth retain
  focused regression coverage.
- Required repository checks are frontend production build, responsive static
  audit, and `git diff --check -- apps/frontend`.

## Out of scope

No API, database, backend, permission, router, or business-workflow changes;
no automatic realtime/polling behavior; no redesign of authentication pages.
