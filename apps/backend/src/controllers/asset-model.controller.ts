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
  protected readonly createSchema: z.ZodType<CreateAssetModelDto> = z
    .strictObject({
      brandId: z.number().int().positive(),
      assetTypeId: z.number().int().positive(),
      name: assetModelNameSchema,
    })
    .transform((data) => ({
      brand_id: data.brandId,
      asset_type_id: data.assetTypeId,
      name: data.name,
    }));

  protected readonly updateSchema: z.ZodType<UpdateAssetModelDto> = z
    .strictObject({
      brandId: z.number().int().positive().optional(),
      assetTypeId: z.number().int().positive().optional(),
      name: assetModelNameSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one asset model field is required',
    })
    .transform((data) => ({
      brand_id: data.brandId,
      asset_type_id: data.assetTypeId,
      name: data.name,
    }));

  protected readonly resourceName = 'Asset model';

  constructor(service: AssetModelService) {
    super(service);
  }

  protected override serialize(assetModel: AssetModel): unknown {
    return {
      id: assetModel.id,
      brandId: assetModel.brand_id,
      assetTypeId: assetModel.asset_type_id,
      name: assetModel.name,
    };
  }
}

export default AssetModelController;
