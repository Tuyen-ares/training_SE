import type { Brand, CreateBrandDto, UpdateBrandDto } from '@/models/brand.model.js';
import type { IBrandRepository } from '@/repositories/brand.repository.js';
import { ConflictError } from '@/shared/app-error.js';
import { BaseService } from '@/shared/base.service.js';

export class BrandService extends BaseService<
  Brand,
  CreateBrandDto,
  UpdateBrandDto,
  IBrandRepository
> {
  constructor(repo: IBrandRepository) {
    super(repo);
  }

  override async create(
    dto: CreateBrandDto,
  ): Promise<{ data?: Brand; error?: string }> {
    const existingBrand = await this.repo.findByName(dto.name);
    if (existingBrand) return { error: 'Brand name already exists' };

    return super.create(dto);
  }

  override async update(id: number, dto: UpdateBrandDto): Promise<Brand | null> {
    const brand = await this.repo.findById(id);
    if (!brand) return null;

    if (dto.name) {
      const brandWithSameName = await this.repo.findByName(dto.name);
      if (brandWithSameName && brandWithSameName.id !== id) {
        throw new ConflictError('Brand name already exists');
      }
    }

    return super.update(id, dto);
  }

  override async delete(id: number): Promise<boolean> {
    const brand = await this.repo.findById(id);
    if (!brand) return false;

    const assetModelCount = await this.repo.countAssetModels(id);
    if (assetModelCount > 0) {
      throw new ConflictError(
        `Cannot delete brand because it is referenced by ${assetModelCount} asset model(s)`,
      );
    }

    return super.delete(id);
  }
}
