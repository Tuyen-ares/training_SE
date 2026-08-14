import type {
  PermissionDto,
  RoleDetailDto,
  RoleOptionDto,
  RoleSummaryDto,
} from '@/models/rbac.model.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export interface IRbacRepository {
  findAllRoles(transaction?: PrismaTransaction): Promise<RoleSummaryDto[]>;
  findRoleOptions(transaction?: PrismaTransaction): Promise<RoleOptionDto[]>;
  findRoleById(id: number, transaction?: PrismaTransaction): Promise<RoleDetailDto | null>;
  findAllPermissions(transaction?: PrismaTransaction): Promise<PermissionDto[]>;
  findRoleIdByName(name: string, transaction?: PrismaTransaction): Promise<number | null>;
  findExistingRoleIds(
    roleIds: number[],
    transaction?: PrismaTransaction,
  ): Promise<number[]>;
  userExists(userId: number, transaction?: PrismaTransaction): Promise<boolean>;
  replaceUserRoles(
    userId: number,
    roleIds: number[],
    transaction: PrismaTransaction,
  ): Promise<void>;
  findExistingPermissionIds(
    permissionIds: number[],
    transaction?: PrismaTransaction,
  ): Promise<number[]>;
  createRole(
    name: string,
    permissionIds: number[],
    transaction: PrismaTransaction,
  ): Promise<number>;
  updateRoleName(
    roleId: number,
    name: string,
    transaction: PrismaTransaction,
  ): Promise<void>;
  replaceRolePermissions(
    roleId: number,
    permissionIds: number[],
    transaction: PrismaTransaction,
  ): Promise<void>;
  lockEssentialPermissions(
    permissionCodes: string[],
    transaction: PrismaTransaction,
  ): Promise<number>;
  hasActiveUserWithPermissions(
    permissionCodes: string[],
    transaction: PrismaTransaction,
  ): Promise<boolean>;
}
