import type {
  CreateUserData,
  UpdateUserData,
  UserResponseDto,
} from '@/models/user.model.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export interface IUserRepository {
  findAll(isActive?: boolean): Promise<UserResponseDto[]>;
  findById(
    id: number,
    transaction?: PrismaTransaction,
  ): Promise<UserResponseDto | null>;
  emailExists(email: string, excludeUserId?: number): Promise<boolean>;
  phoneExists(phone: string, excludeUserId?: number): Promise<boolean>;
  departmentExists(departmentId: number): Promise<boolean>;
  create(data: CreateUserData, transaction: PrismaTransaction): Promise<number>;
  update(
    id: number,
    data: UpdateUserData,
    transaction: PrismaTransaction,
  ): Promise<void>;
  setActive(
    id: number,
    isActive: boolean,
    transaction: PrismaTransaction,
  ): Promise<boolean>;
}
