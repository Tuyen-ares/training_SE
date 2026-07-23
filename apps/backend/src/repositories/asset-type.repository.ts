import type {
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
} from '@/models/asset-type.model.js';
import type { IBaseRepository } from '@/shared/base.repository.js';

export interface IAssetTypeRepository
  extends IBaseRepository<AssetType, CreateAssetTypeDto, UpdateAssetTypeDto> {
  findByName(name: string): Promise<AssetType | null>;
  countAssetModels(assetTypeId: number): Promise<number>;
}
