# train-bigin-se

pnpm monorepo: `apps/backend` (Express 5 + Prisma, JS→TS migration in progress)
and `apps/frontend` (Vue 3 + Vite + Pinia). This is a training repo for the
BigIn SE team — some folders are learning material, not production app code.

## Commands
- `pnpm dev` — backend + frontend together
- `pnpm dev:backend` / `pnpm dev:frontend` — run one side
- `pnpm --filter backend typecheck` — `tsc --noEmit`
- `pnpm --filter backend build` — `tsc` + `tsc-alias` to `dist/`
- `pnpm build:frontend` — `vite build`
- No test suite yet (`apps/backend/tests/` is a placeholder) and no
  lint/format config — don't assume `eslint`/`prettier`/`jest` exist.

## Backend (`apps/backend/src`)
Layered: `routes` → `controllers` → `services` → `repositories` → `prisma`.
Read [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) and
[REFERENCE_REPO_ARCHITECTURE_JS_GUIDE.md](REFERENCE_REPO_ARCHITECTURE_JS_GUIDE.md)
before adding a new layer or pattern.
- Mixed `.js`/`.ts` files mid-migration — match the file you're editing,
  don't convert a whole file to TS as a drive-by change.
- Path alias `@/*` → `src/*`.
- Prisma client output is custom: `apps/backend/generated/prisma` (not
  `node_modules/.prisma`) — never hand-edit `generated/`, it's regenerated.
- Prisma migration workflow: see
  [docs/prisma-migration-newbie-guide.md](docs/prisma-migration-newbie-guide.md).
- Responses go through `shared/api-response.ts` (`ApiResponse.ok/created/...`),
  repositories implement `IBaseRepository`/`BasePrismaRepository` from
  `shared/base.repository.ts`, REST routers use `createRestRouter` from
  `shared/rest-router.ts`. Follow these instead of writing ad-hoc
  res.json()/router wiring.

## Frontend (`apps/frontend/src`)
Vue 3 + Pinia + vue-router, views split by role (`views/admin`,
`views/employee`, `views/login`, `views/train`).

## Don't touch
- `apps/backend/dist/`, `apps/backend/generated/`, `apps/frontend/dist/` —
  build output.
- `nuxt-nodejs-boilerplate/` — untracked reference clone of
  `biginx/nuxt-nodejs-boilerplate` for architecture comparison only, not part
  of this app.
- `training/` — learning sandbox, unrelated to the production app unless a
  task explicitly targets it.

## Secrets
Only `.env.example` files are committed. Never commit `.env`.
