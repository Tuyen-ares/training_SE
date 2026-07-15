import type { IBaseRepository } from '@/shared/base.repository.js';
import type { Asset, CreateAssetDto, UpdateAssetDto } from '@/models/asset.model.js';

export interface IAssetRepository
  extends IBaseRepository<Asset, CreateAssetDto, UpdateAssetDto> {
  findByQrCode(qrCode: string): Promise<Asset | null>;
  findBySerialNumber(serialNumber: string): Promise<Asset | null>;
}
