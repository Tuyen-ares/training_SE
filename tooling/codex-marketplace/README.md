# BigIn Codex Marketplace

This repository-local marketplace adapts the useful parts of
`tammai/bigin-skills` to Codex and to this repository's actual stack:

- Vue 3, Vite, Pinia, and Vue Router
- Express 5, TypeScript migration, Prisma, and MariaDB/MySQL
- pnpm workspaces

It does not install React, Astryx, Nuxt, Fastify, Drizzle, PostgreSQL, a test
runner, or a linter. Astryx is used as design guidance for Vue rather than as a
runtime component dependency.

## Install

From the repository root:

```powershell
codex.cmd plugin marketplace add .\tooling\codex-marketplace
codex.cmd plugin add bigin-codex-harness@personal
```

Start a new Codex thread after installation. Open `/hooks`, review the two
plugin hooks, and trust them before expecting lifecycle enforcement.

## Skills

- `$bigin-task-workflow`: inspect, plan, implement, verify, and review changes.
- `$bigin-vue-enterprise-ui`: build Vue interfaces with enterprise layout and
  interaction conventions.
- `$bigin-express-prisma`: implement backend changes through the existing
  route-to-repository layers.
- `$bigin-verify-change`: select and run checks from the files that changed.

## Local validation

```powershell
node .\tooling\codex-marketplace\plugins\bigin-codex-harness\scripts\tests\hooks.test.mjs
node .\tooling\codex-marketplace\plugins\bigin-codex-harness\skills\bigin-verify-change\scripts\verify.mjs --dry-run
```

The marketplace is intentionally outside `.agents/` and `.codex/` so the team
can version and review it. Those directories remain suitable for local state.
