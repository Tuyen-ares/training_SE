import type { RoleOptionDto } from '@/models/rbac.model.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export interface IRbacRepository {
  findAllRoles(transaction?: PrismaTransaction): Promise<RoleOptionDto[]>;
  findRoleIdByName(name: string, transaction?: PrismaTransaction): Promise<number | null>;
  findExistingRoleIds(
    roleIds: number[],
    transaction?: PrismaTransaction,
  ): Promise<number[]>;
  userExists(userId: number, transaction?: PrismaTransaction): Promise<boolean>;
  replaceUserRoles(
    userId: number,
    roleIds: number[],
    transaction?: PrismaTransaction,
  ): Promise<void>;
}
