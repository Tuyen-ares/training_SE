import type { Brand, CreateBrandDto, UpdateBrandDto } from '@/models/brand.model.js';
import type { IBaseRepository } from '@/shared/base.repository.js';

export interface IBrandRepository
  extends IBaseRepository<Brand, CreateBrandDto, UpdateBrandDto> {
  findByName(name: string): Promise<Brand | null>;
  countAssetModels(brandId: number): Promise<number>;
}
