import { Prisma, type PrismaClient } from '../../generated/prisma/index.js';
import type {
  RegistrationListQuery,
  RegistrationPageDto,
  RegistrationRequestDto,
  RegistrationStatus,
} from '@/models/registration.model.js';
import type {
  CreateRegistrationData,
  IRegistrationRepository,
  LockedRegistrationRequest,
} from '@/repositories/registration.repository.js';
import { RegistrationError } from '@/shared/app-error.js';
import type { PrismaTransaction } from '@/shared/prisma-transaction.js';

type RegistrationDatabase = PrismaClient | PrismaTransaction;
type DatabaseStatus = 'pending' | 'approved' | 'rejected';

const registrationSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  password_hash: true,
  status: true,
  rejection_reason: true,
  reviewed_at: true,
  created_at: true,
  updated_at: true,
  reviewer: { select: { id: true, name: true } },
  created_user: { select: { id: true, name: true } },
} satisfies Prisma.registration_requestsSelect;

type RegistrationRow = Prisma.registration_requestsGetPayload<{ select: typeof registrationSelect }>;

function toDatabaseStatus(status: RegistrationStatus): DatabaseStatus {
  return status.toLowerCase() as DatabaseStatus;
}

function toDto(row: RegistrationRow): RegistrationRequestDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status.toUpperCase() as RegistrationStatus,
    rejectionReason: row.rejection_reason,
    reviewer: row.reviewer,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    createdUser: row.created_user,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapPendingUniqueError(error: unknown): never {
  const prismaError = error as { code?: string; meta?: { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: unknown } } } } };
  if (prismaError.code === 'P2002') {
    const target = `${String(prismaError.meta?.target ?? '')},${String(prismaError.meta?.driverAdapterError?.cause?.constraint?.index ?? '')}`;
    if (target.includes('pending_email')) throw new RegistrationError('PENDING_EMAIL_EXISTS');
    if (target.includes('pending_phone')) throw new RegistrationError('PENDING_PHONE_EXISTS');
  }
  throw error;
}

export class PrismaRegistrationRepository implements IRegistrationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private database(transaction?: PrismaTransaction): RegistrationDatabase {
    return transaction ?? this.prisma;
  }

  async create(data: CreateRegistrationData): Promise<RegistrationRequestDto> {
    try {
      const request = await this.prisma.registration_requests.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          password_hash: data.passwordHash,
          pending_email_key: data.email,
          pending_phone_key: data.phone,
        },
        select: registrationSelect,
      });
      return toDto(request);
    } catch (error) {
      return mapPendingUniqueError(error);
    }
  }

  async findPage(query: RegistrationListQuery): Promise<RegistrationPageDto> {
    const where: Prisma.registration_requestsWhereInput = {
      status: toDatabaseStatus(query.status),
      ...(query.q ? {
        OR: [
          { name: { contains: query.q } },
          { email: { contains: query.q } },
          { phone: { contains: query.q } },
        ],
      } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.registration_requests.findMany({
        where,
        select: registrationSelect,
        orderBy: { created_at: query.status === 'PENDING' ? 'asc' : 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.registration_requests.count({ where }),
    ]);
    return { items: rows.map(toDto), page: query.page, pageSize: query.pageSize, total };
  }

  async findById(id: number, transaction?: PrismaTransaction): Promise<RegistrationRequestDto | null> {
    const request = await this.database(transaction).registration_requests.findUnique({
      where: { id },
      select: registrationSelect,
    });
    return request ? toDto(request) : null;
  }

  async lockById(id: number, transaction: PrismaTransaction): Promise<LockedRegistrationRequest | null> {
    const rows = await transaction.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id FROM registration_requests WHERE id = ${id} FOR UPDATE
    `);
    if (!rows.length) return null;
    const request = await transaction.registration_requests.findUnique({ where: { id }, select: registrationSelect });
    return request ? { ...toDto(request), passwordHash: request.password_hash } : null;
  }

  async markApproved(
    id: number,
    reviewerId: number,
    createdUserId: number,
    transaction: PrismaTransaction,
  ): Promise<void> {
    await transaction.registration_requests.update({
      where: { id },
      data: {
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        created_user_id: createdUserId,
        rejection_reason: null,
        password_hash: null,
        pending_email_key: null,
        pending_phone_key: null,
      },
      select: { id: true },
    });
  }

  async markRejected(
    id: number,
    reviewerId: number,
    rejectionReason: string | null,
    transaction: PrismaTransaction,
  ): Promise<void> {
    await transaction.registration_requests.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        rejection_reason: rejectionReason,
        password_hash: null,
        pending_email_key: null,
        pending_phone_key: null,
      },
      select: { id: true },
    });
  }
}
