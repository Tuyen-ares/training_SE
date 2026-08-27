@RTK.md

## Documentation and project-context workflow

Before implementing a feature or fixing a bug:

1. Read the relevant MVP requirement, user story and business rule.
2. Read the relevant API contract and frontend specification where applicable.
3. Read only the relevant sections of `docs/project-context/implementation-memory.md`.
4. Inspect the current code before making assumptions.
5. Do not use `docs/future/**` as current requirements.

Whenever an API is added, changed or removed, update the same task's API
documentation: `apps/backend/openapi.yaml`, `docs/contracts/api-catalog.md`,
and the relevant contract/spec file. Verify the documented method, path,
permission, request/response shape and error cases against the registered
route and controller before considering the task complete.

After implementation:

1. Run the relevant verification/tests.
2. Update `docs/project-context/implementation-memory.md` only when the task creates an
   architectural decision, important gotcha, evidenced known gap or significant
   implementation decision useful for future work.
3. Do not log trivial edits or every commit.
4. Never store secrets in project context.

`docs/future/**` is `FUTURE / NOT IMPLEMENTED`. Never implement from it unless the
user explicitly moves that scope into active requirements.

## Notification, outbox, and event-workflow governance

Every task that touches notifications, the transactional outbox, delivery
processing, or a workflow that emits a domain event must:

1. Read `docs/plans/2026-08-21-notification-outbox-remediation-checklist.md` before editing.
2. Mark exactly one relevant checklist gap `IN_PROGRESS` before implementing it.
3. Update that gap and its verification evidence in the same change; never mark
   it `COMPLETE` until the relevant tests pass.
4. At the end of each remediation phase, synchronize the single durable
   notification architecture entry in `docs/project-context/implementation-memory.md`.

The checklist owns fix-level progress. Implementation memory must not become a
per-file changelog.
