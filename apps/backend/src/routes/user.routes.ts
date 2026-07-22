import prisma from '@/prisma.js';
import { PrismaUserRepository } from '@/repositories/user.prisma.repository.js';
import { UserService } from '@/services/user.service.js';
import UserController from '@/controllers/user.controller.js';
import { createRestRouter } from '@/shared/rest-router.js';
import { requireAuth, requirePermission } from '@/middleware/auth.middleware.js';

const repo = new PrismaUserRepository(prisma);
const service = new UserService(repo);
const controller = new UserController(service);

export default {
  resource: 'users',
  router: createRestRouter(controller, {
    global: [requireAuth],
    getAll: [requirePermission('user.view')],
    getById: [requirePermission('user.view')],
    create: [requirePermission('user.create')],
    update: [requirePermission('user.update')],
    delete: [requirePermission('user.delete')],
  }),
};
