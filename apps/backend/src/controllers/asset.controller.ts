import { z } from 'zod';
import { BaseController } from '@/shared/base.controller.js';
import type { AssetService } from '@/services/assets.service.js';
import type { Asset, CreateAssetDto, UpdateAssetDto } from '@/models/asset.model.js';

const assetStatusSchema = z.enum(['available', 'borrowed', 'damaged', 'in_repair']);

class AssetController extends BaseController<Asset, CreateAssetDto, UpdateAssetDto> {
  protected readonly createSchema: z.ZodType<CreateAssetDto> = z.object({
    asset_model_id: z.number().int().positive(),
    qr_code: z.string().min(1).max(36),
    serial_number: z.string().min(1).max(100).nullable().optional(),
    status: assetStatusSchema.optional(),
  });

  protected readonly updateSchema: z.ZodType<UpdateAssetDto> = z
    .object({
      asset_model_id: z.number().int().positive().optional(),
      qr_code: z.string().min(1).max(36).optional(),
      serial_number: z.string().min(1).max(100).nullable().optional(),
      status: assetStatusSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one asset field is required',
    });

  protected readonly resourceName = 'Asset';

  constructor(service: AssetService) {
    super(service);
  }
}

export default AssetController;
