# AGENTS.md

Instructions for AI coding agents (Codex, or any tool that reads AGENTS.md)
working in this repository. This repo has no skill/rule auto-loading system
like Claude Code — everything the agent needs is in this one file, so read
all of it before making changes.

## What this repo is

`train-bigin-se` — a training/practice repository for the BigIn SE team. It
contains a real (if small) asset-management-style app (`apps/backend` +
`apps/frontend`) plus explicit learning material (`training/`, `docs/`,
`nuxt-nodejs-boilerplate/`). Not every folder is "production app code" —
see **Repo layout** below before assuming a change belongs everywhere.

## Repo layout

```
apps/
  backend/    Express 5 API, Prisma + MariaDB/MySQL, JS→TS migration in progress
  frontend/   Vue 3 + Vite + Pinia SPA
training/     Standalone learning exercises (e.g. training/http/Method) — NOT
              wired into apps/backend or apps/frontend. Don't assume code
              here is imported anywhere or has to satisfy the same
              conventions as the app.
docs/         Written guides (see below) — check these before re-deriving
              explanations that already exist.
nuxt-nodejs-boilerplate/   Untracked reference clone of
              biginx/nuxt-nodejs-boilerplate, used only for comparing
              architecture. It is its own package (has its own
              package.json/pnpm-lock.yaml) and is NOT part of the
              pnpm-workspace (workspace globs only apps/*). Do not build,
              run, or fix it as part of a task unless explicitly asked.
```

Root is a pnpm workspace (`pnpm-workspace.yaml`: `packages: [apps/*]`), pnpm
version pinned via `packageManager` in root `package.json` (pnpm@10.32.1).

## Setup & commands

Install once at the root (pnpm handles both workspaces):
```
pnpm install
```

Run:
- `pnpm dev` — backend + frontend in parallel
- `pnpm dev:backend` — `tsx watch src/server.ts` in `apps/backend`
- `pnpm dev:frontend` — `vite` in `apps/frontend`
- `pnpm --filter backend typecheck` — `tsc --noEmit`, run this after backend
  changes since there is no CI to catch type errors
- `pnpm --filter backend build` — `tsc -p tsconfig.json && tsc-alias -p tsconfig.json`
  → `apps/backend/dist`
- `pnpm build:frontend` — `vite build` → `apps/frontend/dist`
- `pnpm start:backend` — `node dist/server.js` (run build first)

**There is no test suite** (`apps/backend/tests/` only has a `.gitkeep`) and
**no lint/format config** (no `.eslintrc*`, `.prettierrc*` anywhere in the
repo). Do not invent commands like `pnpm lint` or `pnpm test` — they will
fail. If you add meaningful backend logic, the only automated check
available is `pnpm --filter backend typecheck`; run it yourself before
calling a task done, since nothing enforces this automatically for you (no
git hooks, no CI workflow in this repo as of now).

## Backend architecture (`apps/backend/src`)

Strict layering, request flows one direction only:
```
routes → controllers → services → repositories → prisma → MariaDB/MySQL
```
- **routes/** — URL + HTTP method + middleware wiring only, no business logic.
  Some routes use the generic `createRestRouter(controller)` helper from
  `shared/rest-router.ts` (expects a controller implementing `IRestController`
  with `getAll/getById/create/update/delete`); others are still wired by hand
  (e.g. `auth.routes.js`). Prefer `createRestRouter` for new plain-CRUD
  resources.
- **controllers/** — receive `req`, call a service, shape the response via
  `ApiResponse` (see below). Never call Prisma directly from a controller.
- **services/** — business rules (e.g. "only checkout an available asset").
  Depend on repositories, not on Prisma directly.
- **repositories/** — the only layer allowed to talk to Prisma. New
  repositories should implement `IBaseRepository<TEntity, TCreateDto,
  TUpdateDto>` / extend `BasePrismaRepository` from
  `shared/base.repository.ts` (see `repositories/user.prisma.repository.ts`
  for the pattern) instead of writing bespoke CRUD methods.
- **shared/** — cross-cutting code:
  - `api-response.ts` — `ApiResponse.ok/created/noContent/badRequest/
    notFound/conflict/internalError(res, ...)`. Use these instead of calling
    `res.status(...).json(...)` directly in a controller.
  - `base.repository.ts`, `base.service.ts`, `base.controller.ts` — generic
    base classes/interfaces for the CRUD layers.
  - `rest-router.ts` — `createRestRouter`, see routes note above.

### JS/TS migration state — important

The backend is **mid-migration from plain JS to TypeScript**. `tsconfig.json`
has `allowJs: true`, `checkJs: false`, `strict: false`. As of now:
- Still JS: `database.js`, `middleware/auth.middleware.js`,
  `routes/auth.routes.js`, `services/assets.service.js`,
  `services/auth.service.js`, `services/typeAssets.service.js`.
- Already TS: `app.ts`, `server.ts`, `prisma.ts`, controllers, `user.service.ts`,
  `user.repository.ts`/`user.prisma.repository.ts`, `routes/index.ts`,
  `routes/user.routes.ts`, everything in `shared/`, `models/user.model.ts`.

Rule: **match the file you're editing.** Don't rewrite a `.js` file to `.ts`
as a side effect of an unrelated fix — that's a separate, deliberate task the
user should ask for explicitly. When adding a brand-new file, prefer `.ts`
(that's the direction the migration is going), following the existing TS
files' conventions (interfaces for contracts, generics on the base classes).

Path alias: `@/*` → `apps/backend/src/*` (set in `tsconfig.json` `paths`,
resolved at build time by `tsc-alias`). Use it in new TS files instead of
long relative `../../..` imports.

### Prisma

- Schema: `apps/backend/prisma/schema.prisma`. Migrations in
  `apps/backend/prisma/migrations/`.
- **Custom client output**: the generated client lives at
  `apps/backend/generated/prisma` (not the default `node_modules/.prisma`).
  Never hand-edit anything under `generated/` — it's fully regenerated by
  `prisma generate` / `prisma migrate dev` and is gitignored.
  `apps/backend/src/prisma.ts` is what wires up the actual client instance —
  import from there, not straight from `generated/`.
- Full walkthrough (for anyone, human or agent, new to this workflow):
  [docs/prisma-migration-newbie-guide.md](docs/prisma-migration-newbie-guide.md).
- Uses `@prisma/adapter-mariadb` (driver adapter), not the plain
  `mariadb`/`mysql2` client directly for query execution — those two
  packages are present as transitive/direct deps but the adapter is the
  actual DB bridge Prisma uses.

## Frontend (`apps/frontend/src`)

Vue 3 (Composition API) + Vite + Pinia + vue-router. Views are split by
role/area: `views/admin`, `views/employee`, `views/login`, `views/train`.
Components under `components/` (with `icons/`, `layout/`, `profile/`
subfolders). No API-client service layer exists yet — if you add one, keep it
under `src/services/` (matches the pattern already proposed in
`PROJECT_STRUCTURE.md`) rather than calling `fetch` directly from views.

Frontend env vars must be prefixed `VITE_` to be exposed to the browser —
never put secrets (DB passwords, JWT secrets) in frontend env files.

## Environment & secrets

- Only `.env.example` files are tracked in git. Real `.env` files (and
  `.env.*` variants) are gitignored — never commit one, never print its
  contents in full when reading it for debugging.
- `.claude/`, `.agents/`, `.codex/` directories are gitignored — treat them as
  local tool config, not something to commit on behalf of the user.

## Reference docs already in this repo

Check these before re-explaining something they already cover:
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — target monorepo layout,
  layering rationale, dev/prod script setup, root `.gitignore` proposal.
- [REFERENCE_REPO_ARCHITECTURE_JS_GUIDE.md](REFERENCE_REPO_ARCHITECTURE_JS_GUIDE.md)
  — deeper comparison against the `biginx` reference repo's architecture.
- [DEV_PRODUCTION_REPOSITORY_EXPLAINED.md](DEV_PRODUCTION_REPOSITORY_EXPLAINED.md)
  — dev vs. production repository/workflow explanation.
- [docs/prisma-migration-newbie-guide.md](docs/prisma-migration-newbie-guide.md)
  — Prisma migration workflow for newcomers.

## Operating notes for this specific setup (no Claude-Code-style gates)

This repo doesn't have `bigin-skills`-style enforcement (no pre-commit hook,
no verify-gate, no CLAUDE Code skills/subagents) wired in for Codex. That
means:
- Nothing will automatically stop you from committing broken TypeScript or
  skipping the typecheck — run `pnpm --filter backend typecheck` yourself
  after backend edits, since that's the only correctness signal available.
- There's no scaffolding automation (no equivalent of a "generate CRUD
  resource" skill) — follow the base-class/`createRestRouter` patterns above
  by hand when adding a new resource.
- If the human pairs this repo with Claude Code too, `CLAUDE.md` at the repo
  root covers the same ground in a shorter form for that tool. Keep the two
  in sync if you change conventions described here — update both files
  rather than letting them drift.
