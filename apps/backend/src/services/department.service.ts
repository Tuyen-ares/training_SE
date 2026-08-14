import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/models/department.model.js';
import type { IDepartmentRepository } from '@/repositories/department.repository.js';
import { ConflictError } from '@/shared/app-error.js';
import { BaseService } from '@/shared/base.service.js';

export class DepartmentService extends BaseService<
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  IDepartmentRepository
> {
  constructor(repo: IDepartmentRepository) {
    super(repo);
  }

  override async create(
    dto: CreateDepartmentDto,
  ): Promise<{ data?: Department; error?: string }> {
    const existingDepartment = await this.repo.findByName(dto.name);
    if (existingDepartment) {
      return { error: 'Department name already exists' };
    }

    return super.create(dto);
  }

  override async update(
    id: number,
    dto: UpdateDepartmentDto,
  ): Promise<Department | null> {
    const department = await this.repo.findById(id);
    if (!department) return null;

    const departmentWithSameName = await this.repo.findByName(dto.name);
    if (departmentWithSameName && departmentWithSameName.id !== id) {
      throw new ConflictError('Department name already exists');
    }

    return super.update(id, dto);
  }

  setStatus(id: number, isActive: boolean): Promise<Department | null> {
    return this.repo.setActive(id, isActive);
  }

  override async delete(id: number): Promise<boolean> {
    const department = await this.repo.findById(id);
    if (!department) return false;

    const userCount = await this.repo.countUsers(id);
    if (userCount > 0) {
      throw new ConflictError(
        `Cannot delete department because it is assigned to ${userCount} user(s)`,
      );
    }

    return super.delete(id);
  }
}
