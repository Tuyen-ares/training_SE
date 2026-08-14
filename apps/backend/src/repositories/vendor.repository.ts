import type {
  CreateVendorDto,
  UpdateVendorDto,
  Vendor,
  VendorListQuery,
  VendorPage,
} from '@/models/vendor.model.js';
import type { Prisma } from '../../generated/prisma/index.js';

export type VendorTransaction = Pick<Prisma.TransactionClient, 'vendors' | '$queryRaw'>;

export interface IVendorRepository {
  findPage(query: VendorListQuery): Promise<VendorPage>;
  findById(id: number, transaction?: VendorTransaction): Promise<Vendor | null>;
  findByName(name: string, transaction?: VendorTransaction): Promise<Vendor | null>;
  lockById(id: number, transaction: VendorTransaction): Promise<Vendor | null>;
  create(dto: CreateVendorDto): Promise<Vendor>;
  update(id: number, dto: UpdateVendorDto, transaction: VendorTransaction): Promise<Vendor | null>;
  setActive(id: number, isActive: boolean, transaction: VendorTransaction): Promise<Vendor | null>;
}
