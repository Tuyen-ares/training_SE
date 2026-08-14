import { Prisma, type PrismaClient } from '../../generated/prisma/index.js';
import type {
  PermissionDto,
  RoleDetailDto,
  RoleOptionDto,
  RoleSummaryDto,
} from '@/models/rbac.model.js';
import type { IRbacRepository } from '@/repositories/rbac.repository.js';
import { RbacError } from '@/shared/app-error.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

type RbacDatabase = PrismaClient | PrismaTransaction;

function mapRoleWriteError(error: unknown): never {
  if ((error as { code?: string }).code === 'P2002') {
    throw new RbacError('ROLE_NAME_IN_USE');
  }
  throw error;
}

export class PrismaRbacRepository implements IRbacRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private database(transaction?: PrismaTransaction): RbacDatabase {
    return transaction ?? this.prisma;
  }

  async findAllRoles(transaction?: PrismaTransaction): Promise<RoleSummaryDto[]> {
    const roles = await this.database(transaction).roles.findMany({
      select: {
        id: true,
        name: true,
        is_system: true,
        _count: { select: { role_permissions: true, user_roles: true } },
      },
      orderBy: { name: 'asc' },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      isSystem: role.is_system,
      permissionCount: role._count.role_permissions,
      userCount: role._count.user_roles,
    }));
  }

  async findRoleOptions(transaction?: PrismaTransaction): Promise<RoleOptionDto[]> {
    const roles = await this.database(transaction).roles.findMany({
      select: { id: true, name: true, is_system: true },
      orderBy: { name: 'asc' },
    });
    return roles.map((role) => ({ id: role.id, name: role.name, isSystem: role.is_system }));
  }

  async findRoleById(
    id: number,
    transaction?: PrismaTransaction,
  ): Promise<RoleDetailDto | null> {
    const role = await this.database(transaction).roles.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        is_system: true,
        role_permissions: {
          select: { permissions: { select: { id: true, name: true, code: true, description: true } } },
          orderBy: { permissions: { code: 'asc' } },
        },
        _count: { select: { role_permissions: true, user_roles: true } },
      },
    });
    return role ? {
      id: role.id,
      name: role.name,
      isSystem: role.is_system,
      permissionCount: role._count.role_permissions,
      userCount: role._count.user_roles,
      permissions: role.role_permissions.map((item) => item.permissions),
    } : null;
  }

  findAllPermissions(transaction?: PrismaTransaction): Promise<PermissionDto[]> {
    return this.database(transaction).permissions.findMany({
      select: { id: true, name: true, code: true, description: true },
      orderBy: { code: 'asc' },
    });
  }

  async findRoleIdByName(name: string, transaction?: PrismaTransaction): Promise<number | null> {
    const role = await this.database(transaction).roles.findUnique({
      where: { name },
      select: { id: true },
    });
    return role?.id ?? null;
  }

  async findExistingRoleIds(roleIds: number[], transaction?: PrismaTransaction): Promise<number[]> {
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

  async replaceUserRoles(userId: number, roleIds: number[], transaction: PrismaTransaction): Promise<void> {
    await this.replaceUserRoleSet(transaction, userId, roleIds);
  }

  private async replaceUserRoleSet(database: PrismaTransaction, userId: number, roleIds: number[]): Promise<void> {
    await database.user_roles.deleteMany({ where: { user_id: userId } });
    await database.user_roles.createMany({
      data: roleIds.map((roleId) => ({ user_id: userId, role_id: roleId })),
      skipDuplicates: true,
    });
  }

  async findExistingPermissionIds(permissionIds: number[], transaction?: PrismaTransaction): Promise<number[]> {
    const permissions = await this.database(transaction).permissions.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    return permissions.map(({ id }) => id);
  }

  async createRole(name: string, permissionIds: number[], transaction: PrismaTransaction): Promise<number> {
    try {
      const role = await transaction.roles.create({
        data: {
          name,
          is_system: false,
          role_permissions: { create: permissionIds.map((permissionId) => ({ permission_id: permissionId })) },
        },
        select: { id: true },
      });
      return role.id;
    } catch (error) {
      return mapRoleWriteError(error);
    }
  }

  async updateRoleName(roleId: number, name: string, transaction: PrismaTransaction): Promise<void> {
    try {
      await transaction.roles.update({ where: { id: roleId }, data: { name }, select: { id: true } });
    } catch (error) {
      mapRoleWriteError(error);
    }
  }

  async replaceRolePermissions(roleId: number, permissionIds: number[], transaction: PrismaTransaction): Promise<void> {
    await transaction.role_permissions.deleteMany({ where: { role_id: roleId } });
    await transaction.role_permissions.createMany({
      data: permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })),
      skipDuplicates: true,
    });
  }

  async lockEssentialPermissions(permissionCodes: string[], transaction: PrismaTransaction): Promise<number> {
    const rows = await transaction.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id FROM permissions
      WHERE code IN (${Prisma.join(permissionCodes)})
      ORDER BY id FOR UPDATE
    `);
    return rows.length;
  }

  async hasActiveUserWithPermissions(permissionCodes: string[], transaction: PrismaTransaction): Promise<boolean> {
    const rows = await transaction.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT u.id
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE u.is_active = true AND p.code IN (${Prisma.join(permissionCodes)})
      GROUP BY u.id
      HAVING COUNT(DISTINCT p.code) = ${permissionCodes.length}
      LIMIT 1
    `);
    return rows.length > 0;
  }

}
