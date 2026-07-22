# Express and Prisma Backend Profile

## Request Direction

```text
routes -> controllers -> services -> repositories -> prisma -> MariaDB/MySQL
```

Dependencies must point in that direction. A controller never imports a Prisma
client, and a service never constructs a database adapter.

## Contracts and Implementations

Use interfaces at boundaries that may vary or need isolated verification:

```text
UserService -> IUserRepository <- UserPrismaRepository -> Prisma
```

Keep Prisma-specific input and result shapes inside the repository. Return
application models or explicit DTOs upward when persistence types expose fields
that should not cross the boundary.

## Existing Extension Points

- `src/shared/base.repository.ts`: generic repository contracts and Prisma CRUD.
- `src/shared/base.service.ts`: generic service behavior.
- `src/shared/base.controller.ts`: generic HTTP CRUD controller.
- `src/shared/rest-router.ts`: generic CRUD route wiring.
- `src/shared/api-response.ts`: standard response status and payload helpers.
- `src/shared/app-error.ts`: application error representation.
- `src/shared/request-validation.ts`: request validation support.

Read the actual implementation before extending one of these abstractions. Do
not force a domain command into generic CRUD when it has different invariants.

## Typical New Resource

For conventional CRUD, inspect and add only the layers required by the current
contract:

```text
models/<resource>.model.ts
repositories/<resource>.repository.ts
repositories/<resource>.prisma.repository.ts
services/<resource>.service.ts
controllers/<resource>.controller.ts
routes/<resource>.routes.ts
routes/index.ts registration
```

Use the `@/*` TypeScript alias. Keep constructor injection explicit so service
logic can be reasoned about without a live database.

## Validation and Errors

- Validate path identifiers, query filters, and body DTOs at the HTTP boundary.
- Put cross-record and state-transition rules in the service.
- Translate known uniqueness and foreign-key cases into conflict or bad-request
  application errors without exposing raw Prisma details.
- Return not-found consistently rather than allowing null dereferences.
- Never serialize password hashes, refresh-token material, or signing secrets.

## Authentication

- Parse the Authorization header as one scheme and one credential; reject extra
  non-whitespace parts.
- Verify tokens in middleware or an authentication service, not controllers.
- Distinguish authentication from authorization. A valid token does not imply
  permission for an admin action.
- Store refresh-token state according to the existing schema and revocation
  policy; do not return database token records directly.

## Verification

The minimum automated backend signal is:

```text
pnpm --filter backend typecheck
```

Use `pnpm --filter backend build` when checking emitted imports, aliases, or the
production entry point. Do not use the placeholder `pnpm test` as evidence.
