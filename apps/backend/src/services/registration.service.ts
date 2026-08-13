import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  ApproveRegistrationInputDto,
  RegistrationListQuery,
  RegistrationPageDto,
  RegistrationRequestDto,
  RejectRegistrationInputDto,
  SubmitRegistrationInputDto,
} from '@/models/registration.model.js';
import type { IRegistrationRepository } from '@/repositories/registration.repository.js';
import type { IUserRepository } from '@/repositories/user.repository.js';
import type { RbacService } from '@/services/rbac.service.js';
import { RbacError, RegistrationError, UserError } from '@/shared/app-error.js';
import { hashPassword } from '@/shared/security/password-hasher.js';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class RegistrationService {
  constructor(
    private readonly repository: IRegistrationRepository,
    private readonly userRepository: IUserRepository,
    private readonly rbacService: RbacService,
    private readonly prisma: PrismaClient,
  ) {}

  async submit(input: SubmitRegistrationInputDto): Promise<RegistrationRequestDto> {
    const email = normalizeEmail(input.email);
    const phone = input.phone.trim();
    const [emailExists, phoneExists] = await Promise.all([
      this.userRepository.emailExists(email),
      this.userRepository.phoneExists(phone),
    ]);
    if (emailExists) throw new RegistrationError('EMAIL_IN_USE');
    if (phoneExists) throw new RegistrationError('PHONE_IN_USE');

    return this.repository.create({
      name: input.name.trim(),
      email,
      phone,
      passwordHash: await hashPassword(input.password),
    });
  }

  list(query: RegistrationListQuery): Promise<RegistrationPageDto> {
    return this.repository.findPage(query);
  }

  getById(id: number): Promise<RegistrationRequestDto | null> {
    return this.repository.findById(id);
  }

  async approve(
    requestId: number,
    reviewerId: number,
    input: ApproveRegistrationInputDto,
  ): Promise<RegistrationRequestDto> {
    return this.prisma.$transaction(async (transaction) => {
      const request = await this.repository.lockById(requestId, transaction);
      if (!request) throw new RegistrationError('REQUEST_NOT_FOUND');
      if (request.status !== 'PENDING') throw new RegistrationError('REQUEST_ALREADY_REVIEWED');

      if (!request.passwordHash) throw new RegistrationError('PASSWORD_HASH_MISSING');

      const [departmentExists, emailExists, phoneExists] = await Promise.all([
        this.userRepository.departmentExists(input.departmentId, transaction),
        this.userRepository.emailExists(request.email, undefined, transaction),
        this.userRepository.phoneExists(request.phone, undefined, transaction),
      ]);
      if (!departmentExists) throw new RegistrationError('INVALID_DEPARTMENT');
      if (emailExists) throw new RegistrationError('EMAIL_IN_USE');
      if (phoneExists) throw new RegistrationError('PHONE_IN_USE');

      let roleIds: number[];
      try {
        roleIds = await this.rbacService.resolveInitialRoleIds(input.roleIds, transaction);
      } catch (error) {
        if (error instanceof RbacError) throw new RegistrationError('INVALID_ROLE_SET');
        throw error;
      }

      try {
        const userId = await this.userRepository.create({
          departmentId: input.departmentId,
          name: request.name,
          email: request.email,
          phone: request.phone,
          passwordHash: request.passwordHash,
        }, transaction);
        await this.rbacService.assignRoles(userId, roleIds, transaction);
        await this.repository.markApproved(requestId, reviewerId, userId, transaction);
      } catch (error) {
        if (error instanceof UserError && error.code === 'EMAIL_IN_USE') throw new RegistrationError('EMAIL_IN_USE');
        if (error instanceof UserError && error.code === 'PHONE_IN_USE') throw new RegistrationError('PHONE_IN_USE');
        throw error;
      }

      const approved = await this.repository.findById(requestId, transaction);
      if (!approved) throw new RegistrationError('REQUEST_NOT_FOUND');
      return approved;
    });
  }

  async reject(
    requestId: number,
    reviewerId: number,
    input: RejectRegistrationInputDto,
  ): Promise<RegistrationRequestDto> {
    return this.prisma.$transaction(async (transaction) => {
      const request = await this.repository.lockById(requestId, transaction);
      if (!request) throw new RegistrationError('REQUEST_NOT_FOUND');
      if (request.status !== 'PENDING') throw new RegistrationError('REQUEST_ALREADY_REVIEWED');
      await this.repository.markRejected(
        requestId,
        reviewerId,
        input.rejectionReason?.trim() || null,
        transaction,
      );
      const rejected = await this.repository.findById(requestId, transaction);
      if (!rejected) throw new RegistrationError('REQUEST_NOT_FOUND');
      return rejected;
    });
  }
}
