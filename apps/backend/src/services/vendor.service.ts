import type {
  CreateVendorDto,
  UpdateVendorDto,
  Vendor,
  VendorListQuery,
  VendorPage,
} from '@/models/vendor.model.js';
import type { IVendorRepository } from '@/repositories/vendor.repository.js';
import type { VendorTransaction } from '@/repositories/vendor.repository.js';
import type { PrismaClient } from '../../generated/prisma/index.js';
import { ConflictError } from '@/shared/app-error.js';

function normalizeOptional(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

function normalizeCreate(dto: CreateVendorDto): CreateVendorDto {
  return {
    name: dto.name.trim(),
    contactName: normalizeOptional(dto.contactName),
    phone: normalizeOptional(dto.phone),
    email: normalizeOptional(dto.email),
    address: normalizeOptional(dto.address),
  };
}

function normalizeUpdate(dto: UpdateVendorDto): UpdateVendorDto {
  return {
    ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
    ...(dto.contactName !== undefined ? { contactName: normalizeOptional(dto.contactName) } : {}),
    ...(dto.phone !== undefined ? { phone: normalizeOptional(dto.phone) } : {}),
    ...(dto.email !== undefined ? { email: normalizeOptional(dto.email) } : {}),
    ...(dto.address !== undefined ? { address: normalizeOptional(dto.address) } : {}),
  };
}

export class VendorService {
  constructor(
    private readonly repository: IVendorRepository,
    private readonly prisma: PrismaClient,
  ) {}

  list(query: VendorListQuery): Promise<VendorPage> {
    return this.repository.findPage({ ...query, q: query.q?.trim() || undefined });
  }

  getById(id: number): Promise<Vendor | null> {
    return this.repository.findById(id);
  }

  async create(dto: CreateVendorDto): Promise<Vendor> {
    const normalized = normalizeCreate(dto);
    if (await this.repository.findByName(normalized.name)) {
      throw new ConflictError('Vendor name already exists');
    }
    return this.repository.create(normalized);
  }

  async update(id: number, dto: UpdateVendorDto): Promise<Vendor | null> {
    const normalized = normalizeUpdate(dto);
    return this.prisma.$transaction(async (transaction) => {
      const current = await this.repository.lockById(id, transaction);
      if (!current) return null;
      if (normalized.name !== undefined) {
        const duplicate = await this.repository.findByName(normalized.name, transaction);
        if (duplicate && duplicate.id !== id) throw new ConflictError('Vendor name already exists');
      }
      return this.repository.update(id, normalized, transaction);
    });
  }

  setStatus(id: number, isActive: boolean): Promise<Vendor | null> {
    return this.prisma.$transaction(async (transaction) => {
      if (!(await this.repository.lockById(id, transaction))) return null;
      return this.repository.setActive(id, isActive, transaction);
    });
  }

  lockForAssignmentInTransaction(id: number, transaction: VendorTransaction): Promise<Vendor | null> {
    return this.repository.lockById(id, transaction);
  }
}
