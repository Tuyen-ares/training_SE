import prisma from '@/prisma.js';
import BrandController from '@/controllers/brand.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaBrandRepository } from '@/repositories/brand.prisma.repository.js';
import { BrandService } from '@/services/brand.service.js';
import { createRestRouter } from '@/shared/rest-router.js';

const repository = new PrismaBrandRepository(prisma);
const service = new BrandService(repository);
const controller = new BrandController(service);

export default {
  resource: 'brands',
  router: createRestRouter(controller, {
    global: [requireAuth],
    getAll: [requirePermission('brand.view')],
    getById: [requirePermission('brand.view')],
    create: [requirePermission('brand.create')],
    update: [requirePermission('brand.update')],
    delete: [requirePermission('brand.delete')],
  }),
};
