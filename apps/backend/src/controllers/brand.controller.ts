import { z } from 'zod';
import type { Brand, CreateBrandDto, UpdateBrandDto } from '@/models/brand.model.js';
import type { BrandService } from '@/services/brand.service.js';
import { BaseController } from '@/shared/base.controller.js';

const brandNameSchema = z.string().trim().min(1).max(30);

class BrandController extends BaseController<Brand, CreateBrandDto, UpdateBrandDto> {
  protected readonly createSchema: z.ZodType<CreateBrandDto> = z.object({
    name: brandNameSchema,
  });

  protected readonly updateSchema: z.ZodType<UpdateBrandDto> = z
    .object({
      name: brandNameSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one brand field is required',
    });

  protected readonly resourceName = 'Brand';

  constructor(service: BrandService) {
    super(service);
  }
}

export default BrandController;
