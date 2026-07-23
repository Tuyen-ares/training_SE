import { z } from 'zod';
import type {
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
} from '@/models/asset-type.model.js';
import type { AssetTypeService } from '@/services/asset-type.service.js';
import { BaseController } from '@/shared/base.controller.js';

const assetTypeNameSchema = z.string().trim().min(1).max(30);

class AssetTypeController extends BaseController<
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto
> {
  protected readonly createSchema: z.ZodType<CreateAssetTypeDto> = z.object({
    name: assetTypeNameSchema,
  });

  protected readonly updateSchema: z.ZodType<UpdateAssetTypeDto> = z
    .object({
      name: assetTypeNameSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one asset type field is required',
    });

  protected readonly resourceName = 'Asset type';

  constructor(service: AssetTypeService) {
    super(service);
  }
}

export default AssetTypeController;
