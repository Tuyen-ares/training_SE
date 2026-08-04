import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  AssetModel,
  CreateAssetModelDto,
  UpdateAssetModelDto,
} from '@/models/asset-model.model.js';
import type {
  AssetModelUniqueKey,
  IAssetModelRepository,
} from '@/repositories/asset-model.repository.js';
import { BasePrismaRepository } from '@/shared/base.repository.js';

export class PrismaAssetModelRepository
  extends BasePrismaRepository<AssetModel, CreateAssetModelDto, UpdateAssetModelDto>
  implements IAssetModelRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.asset_models);
  }

  findByUniqueKey(key: AssetModelUniqueKey): Promise<AssetModel | null> {
    return this.prisma.asset_models.findFirst({
      where: {
        brand_id: key.brandId,
        asset_type_id: key.assetTypeId,
        name: key.name,
      },
    });
  }

  async brandExists(brandId: number): Promise<boolean> {
    const brand = await this.prisma.brands.findUnique({
      where: { id: brandId },
      select: { id: true },
    });
    return brand !== null;
  }

  async assetTypeExists(assetTypeId: number): Promise<boolean> {
    const assetType = await this.prisma.asset_types.findUnique({
      where: { id: assetTypeId },
      select: { id: true },
    });
    return assetType !== null;
  }

  countAssets(assetModelId: number): Promise<number> {
    return this.prisma.assets.count({
      where: { asset_model_id: assetModelId },
    });
  }
}
