import { Prisma, type PrismaClient } from '../../generated/prisma/index.js';
import type {
  CreateVendorDto,
  UpdateVendorDto,
  Vendor,
  VendorListQuery,
  VendorPage,
} from '@/models/vendor.model.js';
import type { IVendorRepository, VendorTransaction } from '@/repositories/vendor.repository.js';
import { ConflictError } from '@/shared/app-error.js';

const vendorSelect = {
  id: true,
  name: true,
  contact_name: true,
  phone: true,
  email: true,
  address: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

function mapVendor(vendor: any): Vendor {
  return {
    id: vendor.id,
    name: vendor.name,
    contactName: vendor.contact_name,
    phone: vendor.phone,
    email: vendor.email,
    address: vendor.address,
    isActive: vendor.is_active,
    createdAt: vendor.created_at,
    updatedAt: vendor.updated_at,
  };
}

function mapWriteError(error: unknown): never {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'P2002') throw new ConflictError('Vendor name already exists');
  throw error instanceof Error ? error : new Error('Unknown vendor persistence error');
}

export class PrismaVendorRepository implements IVendorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPage(query: VendorListQuery): Promise<VendorPage> {
    const where = {
      ...(query.q ? { name: { contains: query.q } } : {}),
      ...(query.isActive === undefined ? {} : { is_active: query.isActive }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vendors.findMany({
        where,
        select: vendorSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.vendors.count({ where }),
    ]);
    return {
      items: items.map(mapVendor),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findById(id: number, transaction?: VendorTransaction): Promise<Vendor | null> {
    const database = transaction ?? this.prisma;
    const vendor = await database.vendors.findUnique({ where: { id }, select: vendorSelect });
    return vendor ? mapVendor(vendor) : null;
  }

  async findByName(name: string, transaction?: VendorTransaction): Promise<Vendor | null> {
    const database = transaction ?? this.prisma;
    const vendor = await database.vendors.findUnique({ where: { name }, select: vendorSelect });
    return vendor ? mapVendor(vendor) : null;
  }

  async create(dto: CreateVendorDto): Promise<Vendor> {
    try {
      const vendor = await this.prisma.vendors.create({
        data: {
          name: dto.name,
          contact_name: dto.contactName,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
        },
        select: vendorSelect,
      });
      return mapVendor(vendor);
    } catch (error) {
      return mapWriteError(error);
    }
  }

  async lockById(id: number, transaction: VendorTransaction): Promise<Vendor | null> {
    const rows = await transaction.$queryRaw<Array<{ id: number }>>(
      Prisma.sql`SELECT id FROM vendors WHERE id = ${id} FOR UPDATE`,
    );
    if (!rows.length) return null;
    return this.findById(id, transaction);
  }

  async update(id: number, dto: UpdateVendorDto, transaction: VendorTransaction): Promise<Vendor | null> {
    try {
      const vendor = await transaction.vendors.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.contactName !== undefined ? { contact_name: dto.contactName } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(dto.address !== undefined ? { address: dto.address } : {}),
        },
        select: vendorSelect,
      });
      return mapVendor(vendor);
    } catch (error) {
      return mapWriteError(error);
    }
  }

  async setActive(id: number, isActive: boolean, transaction: VendorTransaction): Promise<Vendor | null> {
    try {
      const vendor = await transaction.vendors.update({
        where: { id },
        data: { is_active: isActive },
        select: vendorSelect,
      });
      return mapVendor(vendor);
    } catch (error) {
      return mapWriteError(error);
    }
  }
}
