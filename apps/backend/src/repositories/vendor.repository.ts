import type {
  CreateVendorDto,
  UpdateVendorDto,
  Vendor,
  VendorListQuery,
  VendorPage,
} from '@/models/vendor.model.js';

export interface IVendorRepository {
  findPage(query: VendorListQuery): Promise<VendorPage>;
  findById(id: number): Promise<Vendor | null>;
  findByName(name: string): Promise<Vendor | null>;
  create(dto: CreateVendorDto): Promise<Vendor>;
  update(id: number, dto: UpdateVendorDto): Promise<Vendor | null>;
  setActive(id: number, isActive: boolean): Promise<Vendor | null>;
}
