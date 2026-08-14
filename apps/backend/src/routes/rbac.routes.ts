import { Router } from 'express';
import prisma from '@/prisma.js';
import RbacController from '@/controllers/rbac.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requireAnyPermission, requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaRbacRepository } from '@/repositories/rbac.prisma.repository.js';
import { RbacService } from '@/services/rbac.service.js';

const repository = new PrismaRbacRepository(prisma);
const service = new RbacService(repository, prisma);
const controller = new RbacController(service);
const router = Router();

router.get(
  '/roles',
  requireAuth,
  requireAnyPermission('role.view', 'role.assign', 'user_registration.review'),
  controller.listRoles,
);
router.get('/roles/:roleId', requireAuth, requirePermission('role.view'), controller.getRole);
router.post('/roles', requireAuth, requirePermission('role.create'), controller.createRole);
router.patch('/roles/:roleId', requireAuth, requirePermission('role.update'), controller.updateRole);
router.put(
  '/roles/:roleId/permissions',
  requireAuth,
  requirePermission('role.update'),
  controller.replaceRolePermissions,
);
router.get(
  '/permissions',
  requireAuth,
  requirePermission('permission.view'),
  controller.listPermissions,
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
