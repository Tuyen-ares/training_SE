import { z } from 'zod';
import type {
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
} from '@/models/asset-type.model.js';
import type { AssetTypeService } from '@/services/asset-type.service.js';
import { BaseController } from '@/shared/base.controller.js';
import { isValidAssetTypePrefixSource } from '@/shared/asset-code.js';

const assetTypeNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .refine(isValidAssetTypePrefixSource, {
    message: 'Asset type name must contain a letter or number for its code prefix',
  });

class AssetTypeController extends BaseController<
  AssetType,
  CreateAssetTypeDto,
  UpdateAssetTypeDto
> {
  protected readonly createSchema: z.ZodType<CreateAssetTypeDto> = z.strictObject({
    name: assetTypeNameSchema,
  });

  protected readonly updateSchema: z.ZodType<UpdateAssetTypeDto> = z
    .strictObject({
      name: assetTypeNameSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one asset type field is required',
    });

  protected readonly resourceName = 'Asset type';

  constructor(service: AssetTypeService) {
    super(service);
  }

  protected override serialize(assetType: AssetType): { id: number; name: string } {
    return { id: assetType.id, name: assetType.name };
  }
}

export default AssetTypeController;
