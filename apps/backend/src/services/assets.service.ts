import { randomUUID } from 'node:crypto';
import type {
  Asset,
  AssetDetailRecordDto,
  AssetListDto,
  AssetListQuery,
  AssetStatus,
  CreateAssetDto,
  RepairResult,
  ReturnCondition,
  UpdateAssetDto,
} from '@/models/asset.model.js';
import type {
  AssetTransaction,
  IAssetRepository,
} from '@/repositories/asset.repository.js';
import type { IBaseService } from '@/shared/base.service.js';
import {
  ConflictError,
  InvalidStateTransitionError,
} from '@/shared/app-error.js';

export class AssetService
  implements IBaseService<Asset, CreateAssetDto, UpdateAssetDto>
{
  constructor(private readonly repo: IAssetRepository) {}

  getAll(): Promise<Asset[]> {
    return this.repo.findAll();
  }

  getById(id: number): Promise<Asset | null> {
    return this.repo.findById(id);
  }

  getReadPage(query: AssetListQuery): Promise<AssetListDto> {
    return this.repo.findReadPage(query);
  }

  getReadDetail(id: number): Promise<AssetDetailRecordDto | null> {
    return this.repo.findReadDetail(id);
  }

  async create(
    dto: CreateAssetDto,
  ): Promise<{ data?: Asset; error?: string }> {
    const assetModelExists = await this.repo.assetModelExists(dto.asset_model_id);
    if (!assetModelExists) {
      return { error: 'Asset model does not exist' };
    }

    if (dto.serial_number) {
      const duplicateSerial = await this.repo.findBySerialNumber(dto.serial_number);
      if (duplicateSerial) {
        return { error: 'Serial number already exists' };
      }
    }

    if (dto.department_id && !(await this.repo.departmentExists(dto.department_id))) {
      return { error: 'Department does not exist' };
    }

    try {
      const data = await this.repo.create({
        asset_model_id: dto.asset_model_id,
        serial_number: dto.serial_number ?? null,
        image_url: dto.image_url ?? null,
        department_id: dto.department_id ?? null,
        qr_code: randomUUID(),
        status: 'available',
      });
      return { data };
    } catch (error) {
      if (error instanceof ConflictError) {
        return { error: error.message };
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateAssetDto): Promise<Asset | null> {
    const asset = await this.repo.findById(id);
    if (!asset) return null;

    if (
      dto.asset_model_id !== undefined &&
      !(await this.repo.assetModelExists(dto.asset_model_id))
    ) {
      throw new ConflictError('Asset model does not exist');
    }

    if (
      dto.department_id !== undefined &&
      dto.department_id !== null &&
      !(await this.repo.departmentExists(dto.department_id))
    ) {
      throw new ConflictError('Department does not exist');
    }

    if (dto.serial_number !== undefined && dto.serial_number !== null) {
      const duplicateSerial = await this.repo.findBySerialNumber(dto.serial_number);
      if (duplicateSerial && duplicateSerial.id !== id) {
        throw new ConflictError('Serial number already exists');
      }
    }

    return this.repo.update(id, dto);
  }

  delete(id: number): Promise<boolean> {
    return this.retire(id);
  }

  async retire(id: number): Promise<boolean> {
    const asset = await this.repo.findById(id);
    if (!asset) return false;

    if (
      asset.status !== 'available' &&
      asset.status !== 'damaged' &&
      asset.status !== 'in_repair'
    ) {
      throw new InvalidStateTransitionError(
        `Cannot retire asset from status "${asset.status}"`,
      );
    }

    await this.transitionOne(id, asset.status, 'retired');
    return true;
  }

  async getReadDetailByQr(qrCode: string): Promise<AssetDetailRecordDto | null> {
    const asset = await this.repo.findByQrCode(qrCode);
    return asset ? this.getReadDetail(asset.id) : null;
  }

  // Call in the same transaction that changes a detail from PENDING to APPROVED.
  reserveForApprovedRequest(
    assetIds: number[],
    transaction: AssetTransaction,
  ): Promise<void> {
    return this.transitionMany(
      assetIds,
      'available',
      'reserved',
      transaction,
    );
  }

  // Confirm the physical handover of assets already held for an approved request.
  confirmHandover(
    assetIds: number[],
    transaction: AssetTransaction,
  ): Promise<void> {
    return this.transitionMany(
      assetIds,
      'reserved',
      'borrowed',
      transaction,
    );
  }

  // Release an approved request that is cancelled before handover.
  cancelApprovedRequest(
    assetIds: number[],
    transaction: AssetTransaction,
  ): Promise<void> {
    return this.transitionMany(
      assetIds,
      'reserved',
      'available',
      transaction,
    );
  }

  returnAsset(
    assetId: number,
    condition: ReturnCondition,
    transaction: AssetTransaction,
  ): Promise<void> {
    const nextStatus: AssetStatus =
      condition === 'good' ? 'available' : 'damaged';
    return this.transitionOne(
      assetId,
      'borrowed',
      nextStatus,
      transaction,
    );
  }

  startRepair(
    assetId: number,
    transaction: AssetTransaction,
  ): Promise<void> {
    return this.transitionOne(
      assetId,
      'damaged',
      'in_repair',
      transaction,
    );
  }

  completeRepair(
    assetId: number,
    result: RepairResult,
    transaction: AssetTransaction,
  ): Promise<void> {
    const nextStatus: AssetStatus =
      result === 'repaired' ? 'available' : 'damaged';
    return this.transitionOne(
      assetId,
      'in_repair',
      nextStatus,
      transaction,
    );
  }

  private async transitionOne(
    assetId: number,
    expectedStatus: AssetStatus,
    nextStatus: AssetStatus,
    transaction?: AssetTransaction,
  ): Promise<void> {
    const updatedCount = await this.repo.transitionStatus(
      [assetId],
      expectedStatus,
      nextStatus,
      transaction,
    );

    if (updatedCount !== 1) {
      throw new InvalidStateTransitionError(
        `Asset ${assetId} is not in status "${expectedStatus}"`,
      );
    }
  }

  private async transitionMany(
    assetIds: number[],
    expectedStatus: AssetStatus,
    nextStatus: AssetStatus,
    transaction: AssetTransaction,
  ): Promise<void> {
    const uniqueAssetIds = [...new Set(assetIds)];
    if (uniqueAssetIds.length === 0) {
      throw new ConflictError('At least one asset is required');
    }

    const updatedCount = await this.repo.transitionStatus(
      uniqueAssetIds,
      expectedStatus,
      nextStatus,
      transaction,
    );

    if (updatedCount !== uniqueAssetIds.length) {
      throw new InvalidStateTransitionError(
        `Not all assets are in status "${expectedStatus}"`,
      );
    }
  }
}
