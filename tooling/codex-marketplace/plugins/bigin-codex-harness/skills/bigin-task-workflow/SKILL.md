---
name: bigin-task-workflow
description: Orchestrate safe repository work for BigIn projects from discovery through planning, implementation, verification, and review. Use for feature work, bug fixes, refactors, migrations, or multi-file changes in the Vue/Vite and Express/Prisma monorepo, especially when the worktree already contains user changes.
---

# BigIn Task Workflow

Follow the repository instead of imposing a generic scaffold. Preserve user
changes and use only commands that the repository actually defines.

## 1. Discover

1. Read the closest `AGENTS.md` files if present.
2. Read [references/repo-profile.md](references/repo-profile.md) when working in
   this training repository or when durable repository instructions are absent.
3. Run `git status --short` before editing. Treat existing modifications as
   user-owned unless the current task created them.
4. Inspect relevant package scripts, routes, neighboring modules, and shared
   helpers before choosing an implementation.
5. Keep `training/`, reference boilerplates, and production app code as separate
   ownership boundaries.

## 2. Classify

Treat a change as narrow when it has a clear local behavior, touches at most a
few related files, and does not alter a shared contract. Implement narrow work
directly after discovery.

Treat a change as substantial when it changes API contracts, database schema,
authentication, shared base classes, cross-package behavior, or a user-facing
workflow. Before editing substantial work:

1. State assumptions and constraints.
2. Create or update a task plan with one active step.
3. Define verification for every affected package.
4. Ask for input only when the repository cannot answer a consequential choice.

Do not require a ceremonial `PLAN.md` for small work. A plan is useful only
when it reduces ambiguity or coordinates multiple steps.

## 3. Select Domain Guidance

- Use `$bigin-vue-enterprise-ui` for files under `apps/frontend`.
- Use `$bigin-express-prisma` for files under `apps/backend`.
- Use both for an end-to-end API and UI workflow.
- Use `$bigin-verify-change` before reporting completion.

## 4. Implement

1. Send a short update before edits describing the files and behavior changing.
2. Match the language and patterns of the files being edited.
3. Keep changes inside the requested ownership boundary.
4. Add abstractions only when they remove real duplication or match an existing
   extension point.
5. Never edit generated Prisma output or print real environment files.
6. Do not replace Vue with React or add Astryx packages to satisfy a visual
   design request. Adapt the design principles to the existing Vue stack.

## 5. Verify and Review

1. Inspect the final diff, including untracked files created by the task.
2. Run checks selected by `$bigin-verify-change`.
3. Review behavior, error states, security boundaries, and missing coverage.
4. Distinguish failures caused by the task from failures already present.
5. Report changed files, verification results, and residual risk. Never claim a
   check passed when it was not run.
