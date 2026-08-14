import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/models/department.model.js';
import type { IBaseRepository } from '@/shared/base.repository.js';

export interface IDepartmentRepository
  extends IBaseRepository<Department, CreateDepartmentDto, UpdateDepartmentDto> {
  findByName(name: string): Promise<Department | null>;
  countUsers(departmentId: number): Promise<number>;
  setActive(id: number, isActive: boolean): Promise<Department | null>;
}
