import { z } from 'zod';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/models/department.model.js';
import type { DepartmentService } from '@/services/department.service.js';
import { BaseController } from '@/shared/base.controller.js';

const departmentNameSchema = z.string().trim().min(1).max(30);

class DepartmentController extends BaseController<
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto
> {
  protected readonly createSchema: z.ZodType<CreateDepartmentDto> = z.object({
    name: departmentNameSchema,
  });

  protected readonly updateSchema: z.ZodType<UpdateDepartmentDto> = z.object({
    name: departmentNameSchema,
  });

  protected readonly resourceName = 'Department';

  constructor(service: DepartmentService) {
    super(service);
  }
}

export default DepartmentController;
