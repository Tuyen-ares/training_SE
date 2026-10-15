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

Repo-specific adapters (kept local, Vue 3 + Express 5 + Prisma + MariaDB):

- `$bigin-task-workflow`: inspect, plan, implement, verify, and review changes.
- `$bigin-vue-enterprise-ui`: build Vue interfaces with enterprise layout and
  interaction conventions.
- `$bigin-express-prisma`: implement backend changes through the existing
  route-to-repository layers.
- `$bigin-verify-change`: select and run checks from the files that changed.

Full sync of upstream `tammai/bigin-skills` v1.110.1 (2026-10-07) under
`plugins/bigin-codex-harness/`:

- `skills/`: `task-workflow`, `epic-workflow`, `discovery-workflow`,
  `bigin-harness-setup`, `model-router`, `write-tests`, `debug-workflow`,
  `contract-sync`, `project-scaffold`, `sprint-distill`, `knowledge-distill`,
  `session-handoff`, `napkin`, `ask-bigin`, plus stack scaffolds
  (`nodejs-scaffold`, `go-scaffold`, `next-scaffold`, `nuxt-scaffold`,
  `nuxt-marketing-scaffold`) and handoffs (`nuxt-ui-figma-handoff`,
  `flutter-figma-handoff`).
- `agents/`: `worker`, `worker-frontier`, `architect`, `architect-frontier`,
  `verifier` (read-only diff audit), `knowledge-auditor`.
- `hooks/`: upstream `harness-drift-check.mjs` wired as a second SessionStart
  hook (non-blocking; Claude-oriented notice, may be silent under Codex).
- `tools/`: `docs_sync.mjs`, `context_budget.mjs`, `docs-manifest.json`,
  `regress.mjs`, `site_build.mjs`.
- `docs/`: `USER_GUIDE.md`, `SPEC-GATE.md`, `GATES.md`, `ROUTING.md`,
  `KNOWLEDGE.md`, `GRAPHIFY.md`, `migrating-off-bff.md`, `polyrepo/`.
- `scripts/git-hooks/`: upstream pre-commit gate.

Known gap: upstream skill bodies reference `${CLAUDE_PLUGIN_ROOT}`;
under Codex the plugin root env is `$PLUGIN_ROOT`. Prefer the
`$bigin-*` adapters for daily work until paths are normalized.

## Local validation

```powershell
node .\tooling\codex-marketplace\plugins\bigin-codex-harness\scripts\tests\hooks.test.mjs
node .\tooling\codex-marketplace\plugins\bigin-codex-harness\skills\bigin-verify-change\scripts\verify.mjs --dry-run
```

The marketplace is intentionally outside `.agents/` and `.codex/` so the team
can version and review it. Those directories remain suitable for local state.
