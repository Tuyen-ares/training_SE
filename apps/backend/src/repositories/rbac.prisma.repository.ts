import type { PrismaClient } from '../../generated/prisma/index.js';
import type { RoleOptionDto } from '@/models/rbac.model.js';
import type { IRbacRepository } from '@/repositories/rbac.repository.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

type RbacDatabase = PrismaClient | PrismaTransaction;

export class PrismaRbacRepository implements IRbacRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private database(transaction?: PrismaTransaction): RbacDatabase {
    return transaction ?? this.prisma;
  }

  async findAllRoles(transaction?: PrismaTransaction): Promise<RoleOptionDto[]> {
    return this.database(transaction).roles.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findRoleIdByName(
    name: string,
    transaction?: PrismaTransaction,
  ): Promise<number | null> {
    const role = await this.database(transaction).roles.findUnique({
      where: { name },
      select: { id: true },
    });
    return role?.id ?? null;
  }

  async findExistingRoleIds(
    roleIds: number[],
    transaction?: PrismaTransaction,
  ): Promise<number[]> {
    const roles = await this.database(transaction).roles.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    return roles.map(({ id }) => id);
  }

  async userExists(userId: number, transaction?: PrismaTransaction): Promise<boolean> {
    const user = await this.database(transaction).users.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user !== null;
  }

  async replaceUserRoles(
    userId: number,
    roleIds: number[],
    transaction?: PrismaTransaction,
  ): Promise<void> {
    if (transaction) {
      await this.replace(transaction, userId, roleIds);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.replace(tx, userId, roleIds);
    });
  }

  private async replace(
    database: PrismaTransaction,
    userId: number,
    roleIds: number[],
  ): Promise<void> {
    await database.user_roles.deleteMany({ where: { user_id: userId } });
    await database.user_roles.createMany({
      data: roleIds.map((roleId) => ({
        user_id: userId,
        role_id: roleId,
      })),
      skipDuplicates: true,
    });
  }
}
