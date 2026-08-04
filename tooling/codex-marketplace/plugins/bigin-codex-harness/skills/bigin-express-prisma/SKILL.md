---
name: bigin-express-prisma
description: Implement or review backend features in the BigIn Express 5, TypeScript, Prisma, and MariaDB application. Use for routes, controllers, services, repositories, authentication, validation, Prisma schema changes, CRUD resources, transactions, or backend architecture decisions in apps/backend.
---

# BigIn Express Prisma

Preserve the repository's layered architecture. This is an incremental
JavaScript-to-TypeScript codebase, not a greenfield Fastify or Drizzle project.

Read [references/backend-profile.md](references/backend-profile.md) before
adding a resource or changing a cross-layer contract.

## Workflow

1. Trace the request from route to controller, service, repository, and Prisma.
2. Inspect matching interfaces, base classes, error helpers, validation helpers,
   and a neighboring resource before editing.
3. Put each rule in the layer that owns it:
   - Route: URL, HTTP method, middleware, handler wiring.
   - Controller: HTTP input/output and `ApiResponse`.
   - Service: business decisions and orchestration.
   - Repository: persistence operations and Prisma mapping.
4. Depend inward on contracts. Services must not import Prisma.
5. Prefer TypeScript for new files. Match an existing file's language when the
   task does not explicitly include migration.
6. Run `pnpm --filter backend typecheck`; also run the backend build when path
   aliases or emitted code changed.

## Resource Rules

- Implement repository contracts with `IBaseRepository` or an established
  resource-specific interface.
- Extend `BasePrismaRepository` for conventional CRUD when its contract fits.
- Use `BaseService`, `BaseController`, and `createRestRouter` for plain CRUD;
  use explicit methods for domain actions such as checkout or approval.
- Import the Prisma instance from `@/prisma` or the established local wrapper.
- Use `ApiResponse` in controllers instead of ad hoc status responses.
- Validate untrusted request data before it reaches business logic.
- Throw or return established application errors; do not leak driver errors,
  password hashes, tokens, or internal stack traces.
- Use a transaction when one business operation writes multiple records that
  must succeed or fail together.

## Prisma Rules

- Edit `prisma/schema.prisma`, never `generated/prisma`.
- Treat schema migration as an explicit database contract change.
- Review nullability, defaults, uniqueness, indexes, delete behavior, and data
  migration impact before generating a migration.
- Do not run a destructive migration or reset a database without explicit user
  authorization.

## Completion Check

Confirm route authorization, validation, business invariants, repository
mapping, conflict/not-found behavior, safe response data, and typecheck output.
State the missing test coverage because this repository has no real backend
test suite.
