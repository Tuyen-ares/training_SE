import type { RoleOptionDto } from '@/models/rbac.model.js';
import type { IRbacRepository } from '@/repositories/rbac.repository.js';
import { RbacError } from '@/shared/app-error.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

const DEFAULT_ROLE_NAME = 'employee';

function uniqueRoleIds(roleIds: number[]): number[] {
  return [...new Set(roleIds)];
}

export class RbacService {
  constructor(private readonly repository: IRbacRepository) {}

  listRoles(): Promise<RoleOptionDto[]> {
    return this.repository.findAllRoles();
  }

  async resolveInitialRoleIds(roleIds?: number[]): Promise<number[]> {
    if (!roleIds || roleIds.length === 0) {
      const defaultRoleName =
        process.env.DEFAULT_REGISTER_ROLE_NAME?.trim() || DEFAULT_ROLE_NAME;
      const defaultRoleId = await this.repository.findRoleIdByName(defaultRoleName);
      if (defaultRoleId === null) {
        throw new RbacError('DEFAULT_ROLE_NOT_FOUND');
      }
      return [defaultRoleId];
    }

    return this.validateRoleIds(roleIds);
  }

  async validateRoleIds(
    roleIds: number[],
    transaction?: PrismaTransaction,
  ): Promise<number[]> {
    const normalizedRoleIds = uniqueRoleIds(roleIds);
    if (normalizedRoleIds.length === 0) {
      throw new RbacError('INVALID_ROLE_SET');
    }

    const existingRoleIds = await this.repository.findExistingRoleIds(
      normalizedRoleIds,
      transaction,
    );
    if (existingRoleIds.length !== normalizedRoleIds.length) {
      throw new RbacError('INVALID_ROLE_SET');
    }

    return normalizedRoleIds;
  }

  async assignRoles(
    userId: number,
    roleIds: number[],
    transaction: PrismaTransaction,
  ): Promise<void> {
    const validRoleIds = await this.validateRoleIds(roleIds, transaction);
    await this.repository.replaceUserRoles(userId, validRoleIds, transaction);
  }

  async replaceUserRoles(userId: number, roleIds: number[]): Promise<void> {
    if (!(await this.repository.userExists(userId))) {
      throw new RbacError('USER_NOT_FOUND');
    }

    const validRoleIds = await this.validateRoleIds(roleIds);
    await this.repository.replaceUserRoles(userId, validRoleIds);
  }
}
