import type { Prisma } from '../../generated/prisma/index.js';
import type {
  Asset,
  AssetDetailRecordDto,
  AssetListDto,
  AssetListQuery,
  AssetStatus,
  UpdateAssetDto,
} from '@/models/asset.model.js';

export interface CreateAssetData {
  asset_model_id: number;
  serial_number: string | null;
  image_url: string | null;
  department_id: number | null;
  qr_code: string;
  status: 'available';
}

export type AssetTransaction = Pick<Prisma.TransactionClient, 'assets'>;

export interface IAssetRepository {
  findAll(): Promise<Asset[]>;
  findById(id: number, transaction?: AssetTransaction): Promise<Asset | null>;
  findReadPage(query: AssetListQuery): Promise<AssetListDto>;
  findReadDetail(id: number): Promise<AssetDetailRecordDto | null>;
  create(data: CreateAssetData): Promise<Asset>;
  update(id: number, data: UpdateAssetDto): Promise<Asset>;
  findBySerialNumber(serialNumber: string): Promise<Asset | null>;
  findByQrCode(qrCode: string): Promise<Asset | null>;
  assetModelExists(assetModelId: number): Promise<boolean>;
  departmentExists(departmentId: number): Promise<boolean>;
  transitionStatus(
    assetIds: number[],
    expectedStatus: AssetStatus,
    nextStatus: AssetStatus,
    transaction?: AssetTransaction,
  ): Promise<number>;
}
