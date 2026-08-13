import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  CreateVendorDto,
  UpdateVendorDto,
  Vendor,
  VendorListQuery,
  VendorPage,
} from '@/models/vendor.model.js';
import type { IVendorRepository } from '@/repositories/vendor.repository.js';
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

  async findById(id: number): Promise<Vendor | null> {
    const vendor = await this.prisma.vendors.findUnique({ where: { id }, select: vendorSelect });
    return vendor ? mapVendor(vendor) : null;
  }

  async findByName(name: string): Promise<Vendor | null> {
    const vendor = await this.prisma.vendors.findUnique({ where: { name }, select: vendorSelect });
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

  async update(id: number, dto: UpdateVendorDto): Promise<Vendor | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM vendors WHERE id = ${id} FOR UPDATE
        `;
        if (!current.length) return null;
        const vendor = await transaction.vendors.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.contactName !== undefined ? { contact_name: dto.contactName } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
            ...(dto.email !== undefined ? { email: dto.email } : {}),
            ...(dto.address !== undefined ? { address: dto.address } : {}),
            ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
          },
          select: vendorSelect,
        });
        return mapVendor(vendor);
      });
    } catch (error) {
      return mapWriteError(error);
    }
  }
}
