import type { Prisma, PrismaClient } from '../../generated/prisma/index.js';
import type {
  CreateUserData,
  UpdateUserData,
  UserResponseDto,
} from '@/models/user.model.js';
import type { IUserRepository } from '@/repositories/user.repository.js';
import { UserError } from '@/shared/app-error.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

const USER_CODE_PREFIX = 'BI';
const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const businessYearFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
});

function getBusinessYear(): number {
  return Number(businessYearFormatter.format(new Date()));
}

function formatUserCode(year: number, sequence: number): string {
  return `${USER_CODE_PREFIX}${String(year).slice(-2)}${String(sequence).padStart(3, '0')}`;
}

const userResponseSelect = {
  id: true,
  user_code: true,
  department_id: true,
  name: true,
  avatar_url: true,
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
    userCode: user.user_code,
    departmentId: user.department_id,
    department: user.department,
    name: user.name,
    avatarUrl: user.avatar_url,
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
    const directTarget = Array.isArray(prismaError.meta?.target)
      ? prismaError.meta.target.join(',')
      : String(prismaError.meta?.target ?? '');
    const adapterTarget = (
      prismaError.meta as {
        driverAdapterError?: { cause?: { constraint?: { index?: unknown } } };
      } | undefined
    )?.driverAdapterError?.cause?.constraint?.index;
    const target = `${directTarget},${String(adapterTarget ?? '')}`;

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

  async emailExists(email: string, excludeUserId?: number, transaction?: PrismaTransaction): Promise<boolean> {
    const user = await this.database(transaction).users.findFirst({
      where: {
        email,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return user !== null;
  }

  async phoneExists(phone: string, excludeUserId?: number, transaction?: PrismaTransaction): Promise<boolean> {
    const user = await this.database(transaction).users.findFirst({
      where: {
        phone,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return user !== null;
  }

  async departmentExists(departmentId: number, transaction?: PrismaTransaction): Promise<boolean> {
    const department = await this.database(transaction).departments.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });
    return department !== null;
  }

  async create(data: CreateUserData, transaction: PrismaTransaction): Promise<number> {
    try {
      const year = getBusinessYear();
      const sequence = await transaction.user_code_sequences.upsert({
        where: { year },
        create: { year, last_sequence: 1 },
        update: { last_sequence: { increment: 1 } },
        select: { last_sequence: true },
      });
      const user = await transaction.users.create({
        data: {
          user_code: formatUserCode(year, sequence.last_sequence),
          department_id: data.departmentId,
          name: data.name,
          avatar_url: data.avatarUrl,
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
          ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl } : {}),
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
