import prisma from '@/prisma.js';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  LoginInput,
  LoginResult,
  RegisterInput,
} from '@/models/auth.model.js';

interface BcryptModule {
  hash(value: string, saltRounds: number): Promise<string>;
  compare(value: string, hash: string): Promise<boolean>;
}

interface JwtModule {
  sign(payload: AccessTokenPayload, secret: string, options: { expiresIn: string }): string;
}

const bcrypt = require('bcrypt') as BcryptModule;
const jwt = require('jsonwebtoken') as JwtModule;
const SALT_ROUNDS = 10;

export type AuthErrorCode =
  | 'EMAIL_IN_USE'
  | 'PHONE_IN_USE'
  | 'INVALID_DEPARTMENT'
  | 'INVALID_ROLE'
  | 'INVALID_EMAIL'
  | 'INVALID_PASSWORD';

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return secret;
}

function createAuthenticatedUser(
  user: { id: number; name: string; email: string; phone: string; department_id: number },
  roleIds: number[],
  permissionCodes: string[],
): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    departmentId: user.department_id,
    roleIds,
    permissionCodes,
  };
}

export async function register(input: RegisterInput): Promise<AuthenticatedUser> {
  const [existingEmail, existingPhone, department, role] = await Promise.all([
    prisma.users.findUnique({ where: { email: input.email } }),
    prisma.users.findUnique({ where: { phone: input.phone } }),
    prisma.departments.findUnique({ where: { id: input.departmentId } }),
    prisma.roles.findUnique({ where: { id: input.roleId } }),
  ]);

  if (existingEmail) throw new AuthError('EMAIL_IN_USE');
  if (existingPhone) throw new AuthError('PHONE_IN_USE');
  if (!department) throw new AuthError('INVALID_DEPARTMENT');
  if (!role) throw new AuthError('INVALID_ROLE');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.users.create({
    data: {
      department_id: input.departmentId,
      name: input.name,
      password: passwordHash,
      email: input.email,
      phone: input.phone,
      user_roles: {
        create: { role_id: input.roleId },
      },
    },
  });

  return createAuthenticatedUser(user, [input.roleId], []);
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const user = await prisma.users.findUnique({
    where: { email: input.email },
    include: {
      user_roles: {
        include: {
          roles: {
            include: {
              role_permissions: {
                include: { permissions: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw new AuthError('INVALID_EMAIL');

  const passwordMatches = await bcrypt.compare(input.password, user.password);
  if (!passwordMatches) throw new AuthError('INVALID_PASSWORD');

  const roleIds = user.user_roles.map((userRole) => userRole.role_id);
  const permissionCodes = [
    ...new Set(
      user.user_roles.flatMap((userRole) =>
        userRole.roles.role_permissions.map(
          (rolePermission) => rolePermission.permissions.code,
        ),
      ),
    ),
  ];

  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    departmentId: user.department_id,
    roleIds,
    permissionCodes,
  };

  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  });

  return {
    token,
    user: createAuthenticatedUser(user, roleIds, permissionCodes),
  };
}
