import type {
  AssetTransaction,
  CreateAssetData,
  IAssetRepository,
} from '@/repositories/asset.repository.js';
import type {
  Asset,
  AssetDetailRecordDto,
  AssetListDto,
  AssetListItemDto,
  AssetListQuery,
  AssetStatus,
  UpdateAssetDto,
} from '@/models/asset.model.js';
import { ConflictError } from '@/shared/app-error.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/index.js';

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
  if (typeof meta !== 'object' || meta === null) {
    return '';
  }

  if ('target' in meta) return String(meta.target);

  // Prisma's MariaDB adapter reports the unique index below
  // driverAdapterError instead of meta.target.
  const driverError = 'driverAdapterError' in meta ? meta.driverAdapterError : undefined;
  if (typeof driverError !== 'object' || driverError === null || !('cause' in driverError)) {
    return '';
  }
  const cause = driverError.cause;
  if (typeof cause !== 'object' || cause === null || !('constraint' in cause)) {
    return '';
  }
  const constraint = cause.constraint;
  if (typeof constraint !== 'object' || constraint === null || !('index' in constraint)) {
    return '';
  }
  return String(constraint.index);
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

  /**
 * Retrieves a paginated list of assets
 */
  async findReadPage(query: AssetListQuery): Promise<AssetListDto> {
    // Build relational filter for asset models
    const assetModelWhere: Prisma.asset_modelsWhereInput = {
      ...(query.modelId ? { id: query.modelId } : {}),
      ...(query.typeId ? { type_id: query.typeId } : {}),
      ...(query.brandId ? { brand_id: query.brandId } : {}),
    };
    // Build main search and filter criteria
    const where: Prisma.assetsWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { department_id: query.departmentId } : {}),
      ...(Object.keys(assetModelWhere).length ? { asset_models: assetModelWhere } : {}),
      ...(query.q
        ? {
            OR: [
              { qr_code: { contains: query.q } },
              { serial_number: { contains: query.q } },
              { asset_models: { name: { contains: query.q } } },
            ],
          }
        : {}),
    };
    // Concurrently fetch paginated records and total count
    const [assets, total] = await this.prisma.$transaction([
      this.prisma.assets.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          asset_models: {
            include: {
              brands: { select: { id: true, name: true } },
              asset_types: { select: { id: true, name: true } },
            },
          },
          departments: { select: { id: true, name: true } },
        },
      }),
      this.prisma.assets.count({ where }),
    ]);

    return {
      items: assets.map((asset): AssetListItemDto => ({
        id: asset.id,
        serialNumber: asset.serial_number,
        qrCode: asset.qr_code,
        imageUrl: asset.image_url,
        status: asset.status.toUpperCase(),
        model: {
          id: asset.asset_models.id,
          name: asset.asset_models.name,
        },
        brand: {
          id: asset.asset_models.brands.id,
          name: asset.asset_models.brands.name,
        },
        type: {
          id: asset.asset_models.asset_types.id,
          name: asset.asset_models.asset_types.name,
        },
        department: asset.departments
          ? { id: asset.departments.id, name: asset.departments.name }
          : null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findReadDetail(id: number): Promise<AssetDetailRecordDto | null> {
    const asset = await this.prisma.assets.findUnique({
      where: { id },
      include: {
        departments: { select: { id: true, name: true } },
        asset_models: {
          include: {
            brands: { select: { id: true, name: true } },
            asset_types: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!asset) return null;

    return {
      id: asset.id,
      serialNumber: asset.serial_number,
      qrCode: asset.qr_code,
      imageUrl: asset.image_url,
      status: asset.status.toUpperCase(),
      model: { id: asset.asset_models.id, name: asset.asset_models.name },
      brand: {
        id: asset.asset_models.brands.id,
        name: asset.asset_models.brands.name,
      },
      type: {
        id: asset.asset_models.asset_types.id,
        name: asset.asset_models.asset_types.name,
      },
      department: asset.departments
        ? { id: asset.departments.id, name: asset.departments.name }
        : null,
    };
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

  findByQrCode(qrCode: string): Promise<Asset | null> {
    return this.prisma.assets.findUnique({ where: { qr_code: qrCode } });
  }

  async assetModelExists(assetModelId: number): Promise<boolean> {
    const assetModel = await this.prisma.asset_models.findUnique({
      where: { id: assetModelId },
      select: { id: true },
    });
    return assetModel !== null;
  }

  async departmentExists(departmentId: number): Promise<boolean> {
    const department = await this.prisma.departments.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });
    return department !== null;
  }

  async updateQrCode(id: number, qrCode: string): Promise<Asset> {
    try {
      return await this.prisma.assets.update({ where: { id }, data: { qr_code: qrCode } });
    } catch (error) {
      throw toAssetPersistenceError(error);
    }
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
