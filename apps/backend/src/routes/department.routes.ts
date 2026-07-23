import prisma from '@/prisma.js';
import DepartmentController from '@/controllers/department.controller.js';
import { requireAuth, requirePermission } from '@/middleware/auth.middleware.js';
import { PrismaDepartmentRepository } from '@/repositories/department.prisma.repository.js';
import { DepartmentService } from '@/services/department.service.js';
import { createRestRouter } from '@/shared/rest-router.js';

const repository = new PrismaDepartmentRepository(prisma);
const service = new DepartmentService(repository);
const controller = new DepartmentController(service);

export default {
  resource: 'departments',
  router: createRestRouter(controller, {
    global: [requireAuth],
    getAll: [requirePermission('department.view')],
    getById: [requirePermission('department.view')],
    create: [requirePermission('department.create')],
    update: [requirePermission('department.update')],
    delete: [requirePermission('department.delete')],
  }),
};
