import type {
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
} from '@/models/asset-type.model.js';
import type { IAssetTypeRepository } from '@/repositories/asset-type.repository.js';
import { normalizeAssetTypePrefix } from '@/shared/asset-code.js';
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
    const normalizedPrefix = normalizeAssetTypePrefix(dto.name);
    const [existingAssetType, existingPrefix] = await Promise.all([
      this.repo.findByName(dto.name),
      this.repo.findByNormalizedPrefix(normalizedPrefix),
    ]);
    if (existingAssetType) return { error: 'Asset type name already exists' };
    if (existingPrefix) return { error: 'Asset type code prefix already exists' };

    try {
      return await super.create({ ...dto, normalized_prefix: normalizedPrefix });
    } catch (error) {
      if (error instanceof ConflictError) return { error: error.message };
      throw error;
    }
  }

  override async update(
    id: number,
    dto: UpdateAssetTypeDto,
  ): Promise<AssetType | null> {
    const assetType = await this.repo.findById(id);
    if (!assetType) return null;

    if (dto.name) {
      const normalizedPrefix = normalizeAssetTypePrefix(dto.name);
      const [assetTypeWithSameName, assetTypeWithSamePrefix] = await Promise.all([
        this.repo.findByName(dto.name),
        this.repo.findByNormalizedPrefix(normalizedPrefix),
      ]);
      if (assetTypeWithSameName && assetTypeWithSameName.id !== id) {
        throw new ConflictError('Asset type name already exists');
      }
      if (assetTypeWithSamePrefix && assetTypeWithSamePrefix.id !== id) {
        throw new ConflictError('Asset type code prefix already exists');
      }
      return this.repo.update(id, { ...dto, normalized_prefix: normalizedPrefix });
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
