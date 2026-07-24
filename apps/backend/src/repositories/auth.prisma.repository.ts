import type { Prisma, PrismaClient } from '../../generated/prisma/index.js';
import type {
  AuthUserRecord,
  IAuthRepository,
} from '@/repositories/auth.repository.js';

const userAuthorizationInclude = {
  user_roles: {
    include: {
      roles: {
        include: {
          role_permissions: {
            include: {
              permissions: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.usersInclude;

// Result shape after Prisma includes roles and their permissions.
type AuthUserQueryResult = Prisma.usersGetPayload<{
  include: typeof userAuthorizationInclude;
}>;

function toAuthUser(user: AuthUserQueryResult): AuthUserRecord {
  const roles = user.user_roles.map(({ roles }) => ({
    id: roles.id,
    name: roles.name,
  }));
  // A user may have many roles, so flatten and remove duplicate permissions.
  const permissionCodes = [
    ...new Set(
      user.user_roles.flatMap(({ roles }) =>
        roles.role_permissions.map(({ permissions }) => permissions.code),
      ),
    ),
  ];

  return {
    id: user.id,
    departmentId: user.department_id,
    name: user.name,
    passwordHash: user.password,
    email: user.email,
    phone: user.phone,
    isActive: user.is_active,
    roles,
    permissionCodes,
  };
}

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: userAuthorizationInclude,
    });
    return user ? toAuthUser(user) : null;
  }

  async findUserById(id: number): Promise<AuthUserRecord | null> {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: userAuthorizationInclude,
    });
    return user ? toAuthUser(user) : null;
  }
}
