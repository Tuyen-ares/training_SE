import type {
  AssetModel,
  CreateAssetModelDto,
  UpdateAssetModelDto,
} from '@/models/asset-model.model.js';
import type { IAssetModelRepository } from '@/repositories/asset-model.repository.js';
import { ConflictError } from '@/shared/app-error.js';
import { BaseService } from '@/shared/base.service.js';

export class AssetModelService extends BaseService<
  AssetModel,
  CreateAssetModelDto,
  UpdateAssetModelDto,
  IAssetModelRepository
> {
  constructor(repo: IAssetModelRepository) {
    super(repo);
  }

  override async create(
    dto: CreateAssetModelDto,
  ): Promise<{ data?: AssetModel; error?: string }> {
    const [brandExists, assetTypeExists, existingAssetModel] = await Promise.all([
      this.repo.brandExists(dto.brand_id),
      this.repo.assetTypeExists(dto.asset_type_id),
      this.repo.findByUniqueKey({
        brandId: dto.brand_id,
        assetTypeId: dto.asset_type_id,
        name: dto.name,
      }),
    ]);

    if (!brandExists) return { error: 'Brand does not exist' };
    if (!assetTypeExists) return { error: 'Asset type does not exist' };
    if (existingAssetModel) {
      return { error: 'Asset model with this brand, asset type and name already exists' };
    }

    return super.create(dto);
  }

  override async update(
    id: number,
    dto: UpdateAssetModelDto,
  ): Promise<AssetModel | null> {
    const currentAssetModel = await this.repo.findById(id);
    if (!currentAssetModel) return null;

    const brandId = dto.brand_id ?? currentAssetModel.brand_id;
    const assetTypeId = dto.asset_type_id ?? currentAssetModel.asset_type_id;
    const name = dto.name ?? currentAssetModel.name;

    const [brandExists, assetTypeExists, duplicateAssetModel] = await Promise.all([
      this.repo.brandExists(brandId),
      this.repo.assetTypeExists(assetTypeId),
      this.repo.findByUniqueKey({ brandId, assetTypeId, name }),
    ]);

    if (!brandExists) throw new ConflictError('Brand does not exist');
    if (!assetTypeExists) throw new ConflictError('Asset type does not exist');
    if (duplicateAssetModel && duplicateAssetModel.id !== id) {
      throw new ConflictError(
        'Asset model with this brand, asset type and name already exists',
      );
    }

    return super.update(id, dto);
  }

  override async delete(id: number): Promise<boolean> {
    const assetModel = await this.repo.findById(id);
    if (!assetModel) return false;

    const assetCount = await this.repo.countAssets(id);
    if (assetCount > 0) {
      throw new ConflictError(
        `Cannot delete asset model because it is referenced by ${assetCount} asset(s)`,
      );
    }

    return super.delete(id);
  }
}
