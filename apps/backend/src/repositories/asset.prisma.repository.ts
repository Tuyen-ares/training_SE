import type {
  AssetTransaction,
  CreateAssetData,
  IAssetRepository,
} from '@/repositories/asset.repository.js';
import type { Asset, AssetStatus, UpdateAssetDto } from '@/models/asset.model.js';
import { ConflictError } from '@/shared/app-error.js';
import type { PrismaClient } from '../../generated/prisma/index.js';

function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function getPrismaErrorTarget(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('meta' in error)) {
    return '';
  }

  const meta = error.meta;
  if (typeof meta !== 'object' || meta === null || !('target' in meta)) {
    return '';
  }

  return String(meta.target);
}

function toAssetPersistenceError(error: unknown): Error {
  const code = getPrismaErrorCode(error);

  if (code === 'P2002') {
    const target = getPrismaErrorTarget(error);
    if (target.includes('serial_number')) {
      return new ConflictError('Serial number already exists');
    }
    if (target.includes('qr_code')) {
      return new ConflictError('QR code already exists');
    }
    return new ConflictError('Asset unique value already exists');
  }

  if (code === 'P2003') {
    return new ConflictError('Asset model does not exist');
  }

  return error instanceof Error ? error : new Error('Unknown asset persistence error');
}

export class PrismaAssetRepository implements IAssetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<Asset[]> {
    return this.prisma.assets.findMany();
  }

  findById(
    id: number,
    transaction?: AssetTransaction,
  ): Promise<Asset | null> {
    const database = transaction ?? this.prisma;
    return database.assets.findUnique({ where: { id } });
  }

  async create(data: CreateAssetData): Promise<Asset> {
    try {
      return await this.prisma.assets.create({ data });
    } catch (error) {
      throw toAssetPersistenceError(error);
    }
  }

  async update(id: number, data: UpdateAssetDto): Promise<Asset> {
    try {
      return await this.prisma.assets.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw toAssetPersistenceError(error);
    }
  }

  findBySerialNumber(serialNumber: string): Promise<Asset | null> {
    return this.prisma.assets.findUnique({ where: { serial_number: serialNumber } });
  }

  async assetModelExists(assetModelId: number): Promise<boolean> {
    const assetModel = await this.prisma.asset_models.findUnique({
      where: { id: assetModelId },
      select: { id: true },
    });
    return assetModel !== null;
  }

  async transitionStatus(
    assetIds: number[],
    expectedStatus: AssetStatus,
    nextStatus: AssetStatus,
    transaction?: AssetTransaction,
  ): Promise<number> {
    const database = transaction ?? this.prisma;
    const result = await database.assets.updateMany({
      where: {
        id: { in: assetIds },
        status: expectedStatus,
      },
      data: { status: nextStatus },
    });
    return result.count;
  }
}
