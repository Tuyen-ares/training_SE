import type {
  CreateRoleInputDto,
  PermissionDto,
  RoleDetailDto,
  RoleOptionDto,
  RoleSummaryDto,
} from '@/models/rbac.model.js';
import type { IRbacRepository } from '@/repositories/rbac.repository.js';
import { RbacError } from '@/shared/app-error.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

const DEFAULT_ROLE_NAME = 'employee';

export const ESSENTIAL_ADMIN_PERMISSIONS = [
  'user.view',
  'user.create',
  'user.update',
  'user.delete',
  'role.view',
  'role.create',
  'role.update',
  'role.assign',
  'permission.view',
  'user_registration.review',
] as const;

function uniqueIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

export class RbacService {
  constructor(private readonly repository: IRbacRepository) {}

  listRoles(): Promise<RoleSummaryDto[]> {
    return this.repository.findAllRoles();
  }

  listRoleOptions(): Promise<RoleOptionDto[]> {
    return this.repository.findRoleOptions();
  }

  getRole(roleId: number): Promise<RoleDetailDto | null> {
    return this.repository.findRoleById(roleId);
  }

  listPermissions(): Promise<PermissionDto[]> {
    return this.repository.findAllPermissions();
  }

  async createRole(input: CreateRoleInputDto): Promise<RoleDetailDto> {
    const name = input.name.trim();
    return this.repository.runInTransaction(async (transaction) => {
      const permissionIds = await this.validatePermissionIds(input.permissionIds, transaction);
      const roleId = await this.repository.createRole(name, permissionIds, transaction);
      const role = await this.repository.findRoleById(roleId, transaction);
      if (!role) throw new RbacError('ROLE_NOT_FOUND');
      return role;
    });
  }

  async updateRoleName(roleId: number, name: string): Promise<RoleDetailDto> {
    return this.repository.runInTransaction(async (transaction) => {
      const role = await this.repository.findRoleById(roleId, transaction);
      if (!role) throw new RbacError('ROLE_NOT_FOUND');
      if (role.isSystem) throw new RbacError('SYSTEM_ROLE_RENAME_FORBIDDEN');
      await this.repository.updateRoleName(roleId, name.trim(), transaction);
      const updated = await this.repository.findRoleById(roleId, transaction);
      if (!updated) throw new RbacError('ROLE_NOT_FOUND');
      return updated;
    });
  }

  async replaceRolePermissions(roleId: number, permissionIds: number[]): Promise<RoleDetailDto> {
    return this.repository.runInTransaction(async (transaction) => {
      await this.lockEssentialAdminGuard(transaction);
      if (!(await this.repository.findRoleById(roleId, transaction))) {
        throw new RbacError('ROLE_NOT_FOUND');
      }
      const validPermissionIds = await this.validatePermissionIds(permissionIds, transaction);
      await this.repository.replaceRolePermissions(roleId, validPermissionIds, transaction);
      await this.assertEssentialAdminExists(transaction);
      const updated = await this.repository.findRoleById(roleId, transaction);
      if (!updated) throw new RbacError('ROLE_NOT_FOUND');
      return updated;
    });
  }

  async resolveInitialRoleIds(roleIds?: number[], transaction?: PrismaTransaction): Promise<number[]> {
    if (!roleIds || roleIds.length === 0) {
      const defaultRoleName = process.env.DEFAULT_REGISTER_ROLE_NAME?.trim() || DEFAULT_ROLE_NAME;
      const defaultRoleId = await this.repository.findRoleIdByName(defaultRoleName, transaction);
      if (defaultRoleId === null) throw new RbacError('DEFAULT_ROLE_NOT_FOUND');
      return [defaultRoleId];
    }
    return this.validateRoleIds(roleIds, transaction);
  }

  async validateRoleIds(roleIds: number[], transaction?: PrismaTransaction): Promise<number[]> {
    const normalized = uniqueIds(roleIds);
    if (normalized.length === 0) throw new RbacError('INVALID_ROLE_SET');
    const existing = await this.repository.findExistingRoleIds(normalized, transaction);
    if (existing.length !== normalized.length) throw new RbacError('INVALID_ROLE_SET');
    return normalized;
  }

  async validatePermissionIds(permissionIds: number[], transaction?: PrismaTransaction): Promise<number[]> {
    const normalized = uniqueIds(permissionIds);
    if (normalized.length === 0) throw new RbacError('INVALID_PERMISSION_SET');
    const existing = await this.repository.findExistingPermissionIds(normalized, transaction);
    if (existing.length !== normalized.length) throw new RbacError('INVALID_PERMISSION_SET');
    return normalized;
  }

  async assignRoles(userId: number, roleIds: number[], transaction: PrismaTransaction): Promise<void> {
    const validRoleIds = await this.validateRoleIds(roleIds, transaction);
    await this.repository.replaceUserRoles(userId, validRoleIds, transaction);
  }

  async replaceUserRoles(userId: number, roleIds: number[]): Promise<void> {
    await this.repository.runInTransaction(async (transaction) => {
      await this.lockEssentialAdminGuard(transaction);
      if (!(await this.repository.userExists(userId, transaction))) throw new RbacError('USER_NOT_FOUND');
      const validRoleIds = await this.validateRoleIds(roleIds, transaction);
      await this.repository.replaceUserRoles(userId, validRoleIds, transaction);
      await this.assertEssentialAdminExists(transaction);
    });
  }

  async lockEssentialAdminGuard(transaction: PrismaTransaction): Promise<void> {
    const count = await this.repository.lockEssentialPermissions([...ESSENTIAL_ADMIN_PERMISSIONS], transaction);
    if (count !== ESSENTIAL_ADMIN_PERMISSIONS.length) {
      throw new RbacError('ESSENTIAL_PERMISSION_MISSING');
    }
  }

  async assertEssentialAdminExists(transaction: PrismaTransaction): Promise<void> {
    if (!(await this.repository.hasActiveUserWithPermissions([...ESSENTIAL_ADMIN_PERMISSIONS], transaction))) {
      throw new RbacError('ESSENTIAL_ADMIN_REQUIRED');
    }
  }
}
