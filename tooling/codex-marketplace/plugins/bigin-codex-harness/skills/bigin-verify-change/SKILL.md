---
name: bigin-verify-change
description: Select and run the repository's real verification commands from changed paths. Use before declaring work complete, during review, or when changes span apps/backend, apps/frontend, or this Codex harness and the agent must avoid nonexistent lint and test commands.
---

# BigIn Verify Change

Use the bundled script to select checks deterministically from Git changes.

## Run

Resolve this skill directory from the loaded `SKILL.md`, then run:

```text
node <skill-directory>/scripts/verify.mjs --dry-run
node <skill-directory>/scripts/verify.mjs
```

Use `--dry-run` first when the worktree contains unrelated changes. Inspect the
selected paths and commands before running checks that may cover user-owned
work.

Supported options:

- `--all`: run backend, frontend, and harness checks.
- `--backend`: force backend typecheck.
- `--frontend`: force frontend build.
- `--harness`: force hook tests.
- `--dry-run`: print selections without executing them.
- `--help`: print usage.

Read [references/check-matrix.md](references/check-matrix.md) when deciding
whether additional manual verification is required.

## Interpret

1. Report each command as passed, failed, or not run.
2. If a check covers pre-existing changes, do not automatically attribute its
   failure to the current task.
3. Inspect the failing diagnostics and affected diff before drawing a cause.
4. Never substitute the backend placeholder test or an invented lint command.
5. For UI work, add viewport and interaction inspection when available; a Vite
   build alone does not validate visual behavior.
