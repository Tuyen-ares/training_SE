# Verification Matrix

| Changed area | Automated check | Additional review |
| --- | --- | --- |
| `apps/backend/**` | `pnpm --filter backend typecheck` | Authorization, validation, errors, persistence mapping |
| `apps/frontend/**` | `pnpm build:frontend` | Responsive layout, keyboard use, loading/error/empty states |
| `tooling/codex-marketplace/**` | Hook test script | Plugin and skill validators |
| Prisma schema/migrations | Backend typecheck | Migration SQL, data impact, rollback or recovery plan |
| Shared API contract | Both backend and frontend checks | Request/response compatibility and failure states |
| Documentation only | None by default | Links, commands, and consistency with source |

The repository currently has no meaningful automated test suite or lint setup.
Call that out as residual risk instead of manufacturing a passing signal.
