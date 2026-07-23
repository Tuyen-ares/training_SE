import { z } from 'zod';
import { BaseController } from '@/shared/base.controller.js';
import type { AssetService } from '@/services/assets.service.js';
import type { Asset, CreateAssetDto, UpdateAssetDto } from '@/models/asset.model.js';
import type { Request, Response } from 'express';
import { ConflictError } from '@/shared/app-error.js';
import { ApiResponse } from '@/shared/api-response.js';

class AssetController extends BaseController<Asset, CreateAssetDto, UpdateAssetDto> {
  protected readonly createSchema: z.ZodType<CreateAssetDto> = z.strictObject({
    asset_model_id: z.number().int().positive(),
    serial_number: z.string().trim().min(1).max(100).nullable().optional(),
  });

  protected readonly updateSchema: z.ZodType<UpdateAssetDto> = z
    .strictObject({
      asset_model_id: z.number().int().positive().optional(),
      serial_number: z.string().trim().min(1).max(100).nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one asset field is required',
    });

  protected readonly resourceName = 'Asset';

  constructor(private readonly assetService: AssetService) {
    super(assetService);
  }

  reportDamaged = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return ApiResponse.badRequest(res, {
        id: ['Asset id must be a positive integer'],
      });
    }

    try {
      const updated = await this.assetService.reportDamaged(id);
      if (!updated) return ApiResponse.notFound(res, 'Asset not found');
      return ApiResponse.noContent(res);
    } catch (error) {
      if (error instanceof ConflictError) {
        return ApiResponse.conflict(res, error.message);
      }
      return ApiResponse.internalError(res);
    }
  };
}

export default AssetController;
