import type {
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
} from '@/models/asset-type.model.js';
import type { IAssetTypeRepository } from '@/repositories/asset-type.repository.js';
import { ConflictError } from '@/shared/app-error.js';
import { BaseService } from '@/shared/base.service.js';

export class AssetTypeService extends BaseService<
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
  IAssetTypeRepository
> {
  constructor(repo: IAssetTypeRepository) {
    super(repo);
  }

  override async create(
    dto: CreateAssetTypeDto,
  ): Promise<{ data?: AssetType; error?: string }> {
    const existingAssetType = await this.repo.findByName(dto.name);
    if (existingAssetType) return { error: 'Asset type name already exists' };

    return super.create(dto);
  }

  override async update(
    id: number,
    dto: UpdateAssetTypeDto,
  ): Promise<AssetType | null> {
    const assetType = await this.repo.findById(id);
    if (!assetType) return null;

    if (dto.name) {
      const assetTypeWithSameName = await this.repo.findByName(dto.name);
      if (assetTypeWithSameName && assetTypeWithSameName.id !== id) {
        throw new ConflictError('Asset type name already exists');
      }
    }

    return super.update(id, dto);
  }

  override async delete(id: number): Promise<boolean> {
    const assetType = await this.repo.findById(id);
    if (!assetType) return false;

    const assetModelCount = await this.repo.countAssetModels(id);
    if (assetModelCount > 0) {
      throw new ConflictError(
        `Cannot delete asset type because it is referenced by ${assetModelCount} asset model(s)`,
      );
    }

    return super.delete(id);
  }
}
