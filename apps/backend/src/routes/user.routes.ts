import { Router } from 'express';
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
import { PrismaMediaRepository } from '@/repositories/media.prisma.repository.js';
import { RbacService } from '@/services/rbac.service.js';
import { SessionService } from '@/services/session.service.js';
import { S3MediaStorage } from '@/services/media-storage.service.js';
import { MediaService } from '@/services/media.service.js';
import { UserService } from '@/services/user.service.js';
import { createRestRouter } from '@/shared/rest-router.js';

const userRepository = new PrismaUserRepository(prisma);
const rbacRepository = new PrismaRbacRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const rbacService = new RbacService(rbacRepository, prisma);
const sessionService = new SessionService(refreshTokenRepository);
const mediaService = new MediaService(
  new PrismaMediaRepository(prisma),
  new S3MediaStorage(),
  prisma,
);
const service = new UserService(
  userRepository,
  rbacService,
  sessionService,
  prisma,
  mediaService,
);
const controller = new UserController(service);

const router = Router();

router.get('/me', requireAuth, controller.getMe);
router.patch('/me', requireAuth, controller.updateMe);
router.patch('/me/password', requireAuth, controller.changePassword);

router.use(createRestRouter(controller, {
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
  delete: false,
}));

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('user.manage_status'),
  controller.updateStatus,
);

export default {
  resource: 'users',
  router,
};
