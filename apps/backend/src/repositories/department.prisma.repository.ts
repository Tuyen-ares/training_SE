import type { PrismaClient } from '../../generated/prisma/index.js';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/models/department.model.js';
import type { IDepartmentRepository } from '@/repositories/department.repository.js';
import { BasePrismaRepository } from '@/shared/base.repository.js';

export class PrismaDepartmentRepository
  extends BasePrismaRepository<Department, CreateDepartmentDto, UpdateDepartmentDto>
  implements IDepartmentRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.departments);
  }

  findByName(name: string): Promise<Department | null> {
    return this.prisma.departments.findUnique({ where: { name } });
  }

  countUsers(departmentId: number): Promise<number> {
    return this.prisma.users.count({
      where: { department_id: departmentId },
    });
  }
}
