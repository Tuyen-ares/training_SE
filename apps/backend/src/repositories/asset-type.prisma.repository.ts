import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
} from '@/models/asset-type.model.js';
import type { IAssetTypeRepository } from '@/repositories/asset-type.repository.js';
import { BasePrismaRepository } from '@/shared/base.repository.js';

export class PrismaAssetTypeRepository
  extends BasePrismaRepository<AssetType, CreateAssetTypeDto, UpdateAssetTypeDto>
  implements IAssetTypeRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.asset_types);
  }

  findByName(name: string): Promise<AssetType | null> {
    return this.prisma.asset_types.findUnique({ where: { name } });
  }

  countAssetModels(assetTypeId: number): Promise<number> {
    return this.prisma.asset_models.count({
      where: { asset_type_id: assetTypeId },
    });
  }
}
