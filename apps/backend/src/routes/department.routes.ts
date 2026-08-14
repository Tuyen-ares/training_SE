import prisma from '@/prisma.js';
import DepartmentController from '@/controllers/department.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requireAnyPermission, requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaDepartmentRepository } from '@/repositories/department.prisma.repository.js';
import { DepartmentService } from '@/services/department.service.js';
import { createRestRouter } from '@/shared/rest-router.js';

const repository = new PrismaDepartmentRepository(prisma);
const service = new DepartmentService(repository);
const controller = new DepartmentController(service);
const router = createRestRouter(controller, {
  global: [requireAuth],
  getAll: [requireAnyPermission('department.view', 'user_registration.review')],
  getById: [requirePermission('department.view')],
  create: [requirePermission('department.create')],
  update: [requirePermission('department.update')],
  delete: false,
});

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('department.manage_status'),
  controller.updateStatus,
);

export default {
  resource: 'departments',
  router,
};
