import { Router } from 'express';
import prisma from '@/prisma.js';
import RbacController from '@/controllers/rbac.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaRbacRepository } from '@/repositories/rbac.prisma.repository.js';
import { RbacService } from '@/services/rbac.service.js';

const repository = new PrismaRbacRepository(prisma);
const service = new RbacService(repository);
const controller = new RbacController(service);
const router = Router();

router.get(
  '/roles',
  requireAuth,
  requirePermission('role.assign'),
  controller.listRoles,
);
router.put(
  '/users/:userId/roles',
  requireAuth,
  requirePermission('role.assign'),
  controller.replaceUserRoles,
);

export default {
  resource: 'rbac',
  router,
};
