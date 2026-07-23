import type {
  AssetModel,
  CreateAssetModelDto,
  UpdateAssetModelDto,
} from '@/models/asset-model.model.js';
import type { IBaseRepository } from '@/shared/base.repository.js';

export interface AssetModelUniqueKey {
  brandId: number;
  assetTypeId: number;
  name: string;
}

export interface IAssetModelRepository
  extends IBaseRepository<AssetModel, CreateAssetModelDto, UpdateAssetModelDto> {
  findByUniqueKey(key: AssetModelUniqueKey): Promise<AssetModel | null>;
  brandExists(brandId: number): Promise<boolean>;
  assetTypeExists(assetTypeId: number): Promise<boolean>;
  countAssets(assetModelId: number): Promise<number>;
}
