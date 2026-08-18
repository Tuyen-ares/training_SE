import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

export interface AuthRoleRecord {
  id: number;
  name: string;
}

export interface AuthUserRecord {
  id: number;
  userCode: string;
  departmentId: number;
  name: string;
  avatarUrl: string | null;
  avatarMediaId?: number | null;
  passwordHash: string;
  email: string;
  phone: string;
  isActive: boolean;
  roles: AuthRoleRecord[];
  permissionCodes: string[];
}

export interface IAuthRepository {
  findUserByEmail(email: string, transaction?: PrismaTransaction): Promise<AuthUserRecord | null>;
  findUserById(id: number, transaction?: PrismaTransaction): Promise<AuthUserRecord | null>;
}
