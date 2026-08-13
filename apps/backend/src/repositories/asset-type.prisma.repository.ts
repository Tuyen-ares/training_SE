import type { PrismaClient } from '../../generated/prisma/index.js';
import type {
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
} from '@/models/asset-type.model.js';
import type { IAssetTypeRepository } from '@/repositories/asset-type.repository.js';
import { ConflictError } from '@/shared/app-error.js';
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

  findByNormalizedPrefix(prefix: string): Promise<AssetType | null> {
    return this.prisma.asset_types.findUnique({
      where: { normalized_prefix: prefix },
    });
  }

  override async create(dto: CreateAssetTypeDto): Promise<AssetType> {
    if (!dto.normalized_prefix) {
      throw new Error('Asset type prefix is required');
    }
    try {
      return await this.prisma.asset_types.create({
        data: { name: dto.name, normalized_prefix: dto.normalized_prefix },
      });
    } catch (error) {
      throw mapAssetTypeWriteError(error);
    }
  }

  override async update(id: number, dto: UpdateAssetTypeDto): Promise<AssetType> {
    try {
      return await this.prisma.$transaction((transaction) =>
        transaction.asset_types.update({ where: { id }, data: dto }),
      );
    } catch (error) {
      throw mapAssetTypeWriteError(error);
    }
  }

  countAssetModels(assetTypeId: number): Promise<number> {
    return this.prisma.asset_models.count({
      where: { asset_type_id: assetTypeId },
    });
  }
}

function mapAssetTypeWriteError(error: unknown): Error {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
    return new ConflictError('Asset type name or code prefix already exists');
  }
  return error instanceof Error ? error : new Error('Unknown asset type persistence error');
}
