import type { PrismaClient } from '../../generated/prisma/index.js';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/models/department.model.js';
import type { IDepartmentRepository } from '@/repositories/department.repository.js';

function mapDepartment(department: { id: number; name: string; is_active: boolean }): Department {
  return {
    id: department.id,
    name: department.name,
    isActive: department.is_active,
  };
}

const departmentSelect = {
  id: true,
  name: true,
  is_active: true,
} as const;

export class PrismaDepartmentRepository implements IDepartmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<Department[]> {
    const departments = await this.prisma.departments.findMany({
      select: departmentSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return departments.map(mapDepartment);
  }

  async findById(id: number): Promise<Department | null> {
    const department = await this.prisma.departments.findUnique({
      where: { id },
      select: departmentSelect,
    });
    return department ? mapDepartment(department) : null;
  }

  async findByName(name: string): Promise<Department | null> {
    const department = await this.prisma.departments.findUnique({
      where: { name },
      select: departmentSelect,
    });
    return department ? mapDepartment(department) : null;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const department = await this.prisma.departments.create({
      data: { name: dto.name },
      select: departmentSelect,
    });
    return mapDepartment(department);
  }

  async update(id: number, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.prisma.departments.update({
      where: { id },
      data: { name: dto.name },
      select: departmentSelect,
    });
    return mapDepartment(department);
  }

  async delete(id: number): Promise<Department> {
    const department = await this.prisma.departments.delete({
      where: { id },
      select: departmentSelect,
    });
    return mapDepartment(department);
  }

  async setActive(id: number, isActive: boolean): Promise<Department | null> {
    const current = await this.prisma.departments.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!current) return null;
    const department = await this.prisma.departments.update({
      where: { id },
      data: { is_active: isActive },
      select: departmentSelect,
    });
    return mapDepartment(department);
  }

  countUsers(departmentId: number): Promise<number> {
    return this.prisma.users.count({ where: { department_id: departmentId } });
  }
}
