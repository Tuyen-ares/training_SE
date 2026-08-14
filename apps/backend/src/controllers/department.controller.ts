import { z } from 'zod';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/models/department.model.js';
import type { DepartmentService } from '@/services/department.service.js';
import { ApiResponse } from '@/shared/api-response.js';
import { BaseController } from '@/shared/base.controller.js';
import { parseRequestBody } from '@/shared/request-validation.js';

const statusSchema = z.strictObject({ isActive: z.boolean() });

function parsePositiveId(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const departmentNameSchema = z.string().trim().min(1).max(30);

class DepartmentController extends BaseController<
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto
> {
  protected readonly createSchema: z.ZodType<CreateDepartmentDto> = z.strictObject({
    name: departmentNameSchema,
  });

  protected readonly updateSchema: z.ZodType<UpdateDepartmentDto> = z.strictObject({
    name: departmentNameSchema,
  });

  protected readonly resourceName = 'Department';
  private readonly departmentService: DepartmentService;

  constructor(service: DepartmentService) {
    super(service);
    this.departmentService = service;
  }

  updateStatus = async (req: import('express').Request, res: import('express').Response): Promise<void> => {
    const id = parsePositiveId(req.params.id);
    if (!id) return ApiResponse.badRequest(res, { id: ['Department ID must be a positive integer'] });
    const parsed = parseRequestBody(statusSchema, req.body);
    if (parsed.success === false) return ApiResponse.badRequest(res, parsed.errors);
    try {
      const department = await this.departmentService.setStatus(id, parsed.data.isActive);
      if (!department) return ApiResponse.notFound(res, 'Department not found');
      return ApiResponse.ok(res, department);
    } catch {
      return ApiResponse.internalError(res);
    }
  };
}

export default DepartmentController;
