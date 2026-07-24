import type { Prisma, PrismaClient } from '../../generated/prisma/index.js';
import type {
  CreateUserData,
  UpdateUserData,
  UserResponseDto,
} from '@/models/user.model.js';
import type { IUserRepository } from '@/repositories/user.repository.js';
import { UserError } from '@/shared/app-error.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

const userResponseSelect = {
  id: true,
  department_id: true,
  name: true,
  email: true,
  phone: true,
  is_active: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  user_roles: {
    select: {
      roles: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.usersSelect;

type UserQueryResult = Prisma.usersGetPayload<{
  select: typeof userResponseSelect;
}>;

type UserDatabase = PrismaClient | PrismaTransaction;

function toUserResponseDto(user: UserQueryResult): UserResponseDto {
  return {
    id: user.id,
    departmentId: user.department_id,
    department: user.department,
    name: user.name,
    email: user.email,
    phone: user.phone,
    isActive: user.is_active,
    roles: user.user_roles.map(({ roles }) => roles),
  };
}

function mapUniqueConstraintError(error: unknown): never {
  const prismaError = error as {
    code?: string;
    meta?: { target?: unknown };
  };

  if (prismaError.code === 'P2002') {
    const target = Array.isArray(prismaError.meta?.target)
      ? prismaError.meta.target.join(',')
      : String(prismaError.meta?.target ?? '');

    if (target.includes('email')) throw new UserError('EMAIL_IN_USE');
    if (target.includes('phone')) throw new UserError('PHONE_IN_USE');
  }

  throw error;
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private database(transaction?: PrismaTransaction): UserDatabase {
    return transaction ?? this.prisma;
  }

  async findAll(isActive?: boolean): Promise<UserResponseDto[]> {
    const users = await this.prisma.users.findMany({
      where: isActive === undefined ? undefined : { is_active: isActive },
      select: userResponseSelect,
      orderBy: { id: 'desc' },
    });
    return users.map(toUserResponseDto);
  }

  async findById(
    id: number,
    transaction?: PrismaTransaction,
  ): Promise<UserResponseDto | null> {
    const user = await this.database(transaction).users.findUnique({
      where: { id },
      select: userResponseSelect,
    });
    return user ? toUserResponseDto(user) : null;
  }

  async emailExists(email: string, excludeUserId?: number): Promise<boolean> {
    const user = await this.prisma.users.findFirst({
      where: {
        email,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return user !== null;
  }

  async phoneExists(phone: string, excludeUserId?: number): Promise<boolean> {
    const user = await this.prisma.users.findFirst({
      where: {
        phone,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return user !== null;
  }

  async departmentExists(departmentId: number): Promise<boolean> {
    const department = await this.prisma.departments.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });
    return department !== null;
  }

  async create(data: CreateUserData, transaction: PrismaTransaction): Promise<number> {
    try {
      const user = await transaction.users.create({
        data: {
          department_id: data.departmentId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.passwordHash,
        },
        select: { id: true },
      });
      return user.id;
    } catch (error) {
      return mapUniqueConstraintError(error);
    }
  }

  async update(
    id: number,
    data: UpdateUserData,
    transaction: PrismaTransaction,
  ): Promise<void> {
    try {
      await transaction.users.update({
        where: { id },
        data: {
          ...(data.departmentId !== undefined
            ? { department_id: data.departmentId }
            : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.passwordHash !== undefined
            ? { password: data.passwordHash }
            : {}),
        },
        select: { id: true },
      });
    } catch (error) {
      mapUniqueConstraintError(error);
    }
  }

  async setActive(
    id: number,
    isActive: boolean,
    transaction: PrismaTransaction,
  ): Promise<boolean> {
    const result = await transaction.users.updateMany({
      where: { id },
      data: { is_active: isActive },
    });
    return result.count === 1;
  }
}
