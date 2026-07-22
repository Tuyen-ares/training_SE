# train-bigin-se Repository Profile

## Boundaries

- `apps/backend`: Express 5 API with Prisma and MariaDB/MySQL.
- `apps/frontend`: Vue 3, Vite, Pinia, and Vue Router SPA.
- `training`: standalone learning exercises, not application modules.
- `nuxt-nodejs-boilerplate`: architecture reference, not a workspace package.
- `tooling/codex-marketplace`: Codex development harness, not runtime code.

The root pnpm workspace includes only `apps/*`. Do not build or repair reference
repositories unless the user explicitly asks.

## Valid Commands

Run commands from the repository root:

```text
pnpm install
pnpm dev
pnpm dev:backend
pnpm dev:frontend
pnpm --filter backend typecheck
pnpm --filter backend build
pnpm build:frontend
pnpm start:backend
```

There is no working lint command or automated test suite. The backend `test`
script is a failing placeholder. Do not invent `pnpm lint` or claim
`pnpm test` is a valid gate.

## Backend Contract

Keep request flow one directional:

```text
routes -> controllers -> services -> repositories -> prisma -> database
```

- Routes wire URL, method, middleware, and controller only.
- Controllers translate HTTP input/output and use `ApiResponse`.
- Services own business rules and depend on repository contracts.
- Repositories are the only application layer allowed to call Prisma.
- Prefer `BasePrismaRepository`, `IBaseRepository`, generic services,
  controllers, and `createRestRouter` for plain CRUD.
- Match the extension of existing files. Prefer TypeScript for new files.
- Import the client from `src/prisma.ts`, never generated output directly.
- Use the `@/*` alias in new TypeScript files.

Run `pnpm --filter backend typecheck` after backend changes. Run the backend
build as an additional check when aliases or emitted output are relevant.

## Frontend Contract

- `views`: route-level orchestration and page composition.
- `components/layout`: application shell shared across routes.
- `components/common`: reusable presentation and interaction primitives.
- `components/<feature>`: reusable components owned by one business feature.
- `services`: HTTP client and endpoint functions.
- `stores`: shared client state and session state.
- `composables`: reusable stateful Vue behavior.

Keep API calls out of views when a service module can own them. Preserve the
existing JavaScript direction unless the user requests a TypeScript migration.
Run `pnpm build:frontend` after frontend changes.

## Data and Secrets

- Prisma schema: `apps/backend/prisma/schema.prisma`.
- Generated client: `apps/backend/generated/prisma`; never hand-edit it.
- Track only `.env.example`; never print or commit real `.env` files.
- Browser environment variables must start with `VITE_` and must not contain
  database credentials or JWT secrets.

## Worktree Safety

This training repository is frequently dirty. Do not revert, rename, or format
unrelated files. Read overlapping edits before modifying a file and report any
pre-existing failure that prevents reliable verification.
