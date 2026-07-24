import prisma from '@/prisma.js';
import UserController from '@/controllers/user.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import {
  requirePermission,
  requireRoleAssignWhenRoleIdsProvided,
} from '@/middleware/rbac.middleware.js';
import { PrismaRbacRepository } from '@/repositories/rbac.prisma.repository.js';
import { PrismaRefreshTokenRepository } from '@/repositories/refresh-token.prisma.repository.js';
import { PrismaUserRepository } from '@/repositories/user.prisma.repository.js';
import { RbacService } from '@/services/rbac.service.js';
import { SessionService } from '@/services/session.service.js';
import { UserService } from '@/services/user.service.js';
import { createRestRouter } from '@/shared/rest-router.js';

const userRepository = new PrismaUserRepository(prisma);
const rbacRepository = new PrismaRbacRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const rbacService = new RbacService(rbacRepository);
const sessionService = new SessionService(refreshTokenRepository);
const service = new UserService(
  userRepository,
  rbacService,
  sessionService,
  prisma,
);
const controller = new UserController(service);

const router = createRestRouter(controller, {
  global: [requireAuth],
  getAll: [requirePermission('user.view')],
  getById: [requirePermission('user.view')],
  create: [
    requirePermission('user.create'),
    requireRoleAssignWhenRoleIdsProvided(),
  ],
  update: [
    requirePermission('user.update'),
    requireRoleAssignWhenRoleIdsProvided(),
  ],
  delete: [requirePermission('user.delete')],
});

router.patch(
  '/:id/activate',
  requireAuth,
  requirePermission('user.update'),
  controller.activate,
);

export default {
  resource: 'users',
  router,
};
