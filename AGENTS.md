@RTK.md

## Documentation and project-context workflow

Before implementing a feature or fixing a bug:

1. Read the relevant MVP requirement, user story and business rule.
2. Read the relevant API contract and frontend specification where applicable.
3. Read only the relevant sections of `docs/project-context/implementation-memory.md`.
4. Inspect the current code before making assumptions.
5. Do not use `docs/future/**` as current requirements.

After implementation:

1. Run the relevant verification/tests.
2. Update `docs/project-context/implementation-memory.md` only when the task creates an
   architectural decision, important gotcha, evidenced known gap or significant
   implementation decision useful for future work.
3. Do not log trivial edits or every commit.
4. Never store secrets in project context.

`docs/future/**` is `FUTURE / NOT IMPLEMENTED`. Never implement from it unless the
user explicitly moves that scope into active requirements.
