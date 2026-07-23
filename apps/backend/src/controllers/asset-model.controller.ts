import { z } from 'zod';
import type {
  AssetModel,
  CreateAssetModelDto,
  UpdateAssetModelDto,
} from '@/models/asset-model.model.js';
import type { AssetModelService } from '@/services/asset-model.service.js';
import { BaseController } from '@/shared/base.controller.js';

const assetModelNameSchema = z.string().trim().min(1).max(30);

class AssetModelController extends BaseController<
  AssetModel,
  CreateAssetModelDto,
  UpdateAssetModelDto
> {
  protected readonly createSchema: z.ZodType<CreateAssetModelDto> = z.object({
    brand_id: z.number().int().positive(),
    asset_type_id: z.number().int().positive(),
    name: assetModelNameSchema,
  });

  protected readonly updateSchema: z.ZodType<UpdateAssetModelDto> = z
    .object({
      brand_id: z.number().int().positive().optional(),
      asset_type_id: z.number().int().positive().optional(),
      name: assetModelNameSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one asset model field is required',
    });

  protected readonly resourceName = 'Asset model';

  constructor(service: AssetModelService) {
    super(service);
  }
}

export default AssetModelController;
