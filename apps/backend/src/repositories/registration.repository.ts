import type {
  RegistrationListQuery,
  RegistrationPageDto,
  RegistrationRequestDto,
} from '@/models/registration.model.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export interface CreateRegistrationData {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
}

export interface LockedRegistrationRequest extends RegistrationRequestDto {
  passwordHash: string | null;
}

export interface IRegistrationRepository {
  create(data: CreateRegistrationData): Promise<RegistrationRequestDto>;
  findPage(query: RegistrationListQuery): Promise<RegistrationPageDto>;
  findById(id: number, transaction?: PrismaTransaction): Promise<RegistrationRequestDto | null>;
  lockById(id: number, transaction: PrismaTransaction): Promise<LockedRegistrationRequest | null>;
  markApproved(
    id: number,
    reviewerId: number,
    createdUserId: number,
    transaction: PrismaTransaction,
  ): Promise<void>;
  markRejected(
    id: number,
    reviewerId: number,
    rejectionReason: string | null,
    transaction: PrismaTransaction,
  ): Promise<void>;
}
