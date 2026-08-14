import { Router } from 'express';
import prisma from '@/prisma.js';
import RegistrationController from '@/controllers/registration.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaRbacRepository } from '@/repositories/rbac.prisma.repository.js';
import { PrismaRegistrationRepository } from '@/repositories/registration.prisma.repository.js';
import { PrismaUserRepository } from '@/repositories/user.prisma.repository.js';
import { RbacService } from '@/services/rbac.service.js';
import { RegistrationService } from '@/services/registration.service.js';

const router = Router();
const rbacService = new RbacService(new PrismaRbacRepository(prisma), prisma);
const service = new RegistrationService(
  new PrismaRegistrationRepository(prisma),
  new PrismaUserRepository(prisma),
  rbacService,
  prisma,
);
const controller = new RegistrationController(service);
const requireReview = [requireAuth, requirePermission('user_registration.review')];

router.post('/', controller.submit);
router.get('/', ...requireReview, controller.list);
router.get('/:requestId', ...requireReview, controller.getById);
router.post('/:requestId/approve', ...requireReview, controller.approve);
router.post('/:requestId/reject', ...requireReview, controller.reject);

export default { resource: 'registration-requests', router };
