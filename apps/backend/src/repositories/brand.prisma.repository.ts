import type { PrismaClient } from '../../generated/prisma/index.js';
import type { Brand, CreateBrandDto, UpdateBrandDto } from '@/models/brand.model.js';
import type { IBrandRepository } from '@/repositories/brand.repository.js';
import { BasePrismaRepository } from '@/shared/base.repository.js';

export class PrismaBrandRepository
  extends BasePrismaRepository<Brand, CreateBrandDto, UpdateBrandDto>
  implements IBrandRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.brands);
  }

  findByName(name: string): Promise<Brand | null> {
    return this.prisma.brands.findUnique({ where: { name } });
  }

  countAssetModels(brandId: number): Promise<number> {
    return this.prisma.asset_models.count({ where: { brand_id: brandId } });
  }
}
