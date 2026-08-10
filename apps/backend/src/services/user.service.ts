import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  CreateUserInputDto,
  UpdateUserData,
  UpdateUserInputDto,
  UserResponseDto,
  UserStatusFilter,
} from '@/models/user.model.js';
import type { IUserRepository } from '@/repositories/user.repository.js';
import type { RbacService } from '@/services/rbac.service.js';
import type { SessionService } from '@/services/session.service.js';
import { RbacError, UserError } from '@/shared/app-error.js';
import { hashPassword } from '@/shared/security/password-hasher.js';

export class UserService {
  constructor(
    private readonly repository: IUserRepository,
    private readonly rbacService: RbacService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaClient,
  ) {}

  getAll(status: UserStatusFilter = 'active'): Promise<UserResponseDto[]> {
    const isActive =
      status === 'all' ? undefined : status === 'active';
    return this.repository.findAll(isActive);
  }

  getById(id: number): Promise<UserResponseDto | null> {
    return this.repository.findById(id);
  }

  async create(input: CreateUserInputDto): Promise<UserResponseDto> {
    const [emailExists, phoneExists, departmentExists] = await Promise.all([
      this.repository.emailExists(input.email),
      this.repository.phoneExists(input.phone),
      this.repository.departmentExists(input.departmentId),
    ]);

    if (emailExists) throw new UserError('EMAIL_IN_USE');
    if (phoneExists) throw new UserError('PHONE_IN_USE');
    if (!departmentExists) throw new UserError('INVALID_DEPARTMENT');

    const roleIds = await this.resolveInitialRoleIds(input.roleIds);
    const passwordHash = await hashPassword(input.password);

    return this.prisma.$transaction(async (transaction) => {
      const userId = await this.repository.create(
        {
          departmentId: input.departmentId,
          name: input.name,
          avatarUrl: input.avatarUrl,
          email: input.email,
          phone: input.phone,
          passwordHash,
        },
        transaction,
      );

      await this.rbacService.assignRoles(userId, roleIds, transaction);

      const user = await this.repository.findById(userId, transaction);
      if (!user) throw new UserError('USER_NOT_FOUND');
      return user;
    });
  }

  async update(
    id: number,
    input: UpdateUserInputDto,
  ): Promise<UserResponseDto | null> {
    const currentUser = await this.repository.findById(id);
    if (!currentUser) return null;

    const [emailExists, phoneExists, departmentExists] = await Promise.all([
      input.email
        ? this.repository.emailExists(input.email, id)
        : Promise.resolve(false),
      input.phone
        ? this.repository.phoneExists(input.phone, id)
        : Promise.resolve(false),
      input.departmentId
        ? this.repository.departmentExists(input.departmentId)
        : Promise.resolve(true),
    ]);

    if (emailExists) throw new UserError('EMAIL_IN_USE');
    if (phoneExists) throw new UserError('PHONE_IN_USE');
    if (!departmentExists) throw new UserError('INVALID_DEPARTMENT');

    const roleIds =
      input.roleIds === undefined
        ? undefined
        : await this.validateRoleIds(input.roleIds);

    const updateData: UpdateUserData = {
      ...(input.departmentId !== undefined
        ? { departmentId: input.departmentId }
        : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.password !== undefined
        ? { passwordHash: await hashPassword(input.password) }
        : {}),
    };

    return this.prisma.$transaction(async (transaction) => {
      if (Object.keys(updateData).length > 0) {
        await this.repository.update(id, updateData, transaction);
      }
      if (roleIds) {
        await this.rbacService.assignRoles(id, roleIds, transaction);
      }

      const user = await this.repository.findById(id, transaction);
      if (!user) throw new UserError('USER_NOT_FOUND');
      return user;
    });
  }

  async setStatus(id: number, isActive: boolean): Promise<UserResponseDto | null> {
    if (!(await this.repository.findById(id))) return null;

    return this.prisma.$transaction(async (transaction) => {
      const updated = await this.repository.setActive(id, isActive, transaction);
      if (!updated) return null;

      if (!isActive) {
        await this.sessionService.revokeAllForUser(id, transaction);
      }

      return this.repository.findById(id, transaction);
    });
  }

  private async resolveInitialRoleIds(roleIds?: number[]): Promise<number[]> {
    try {
      return await this.rbacService.resolveInitialRoleIds(roleIds);
    } catch (error) {
      if (error instanceof RbacError && error.code === 'INVALID_ROLE_SET') {
        throw new UserError('INVALID_ROLE_SET');
      }
      throw error;
    }
  }

  private async validateRoleIds(roleIds: number[]): Promise<number[]> {
    try {
      return await this.rbacService.validateRoleIds(roleIds);
    } catch (error) {
      if (error instanceof RbacError) {
        throw new UserError('INVALID_ROLE_SET');
      }
      throw error;
    }
  }
}
