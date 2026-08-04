import prisma from '@/prisma.js';
import AssetModelController from '@/controllers/asset-model.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaAssetModelRepository } from '@/repositories/asset-model.prisma.repository.js';
import { AssetModelService } from '@/services/asset-model.service.js';
import { createRestRouter } from '@/shared/rest-router.js';

const repository = new PrismaAssetModelRepository(prisma);
const service = new AssetModelService(repository);
const controller = new AssetModelController(service);

export default {
  resource: 'asset-models',
  router: createRestRouter(controller, {
    global: [requireAuth],
    getAll: [requirePermission('asset_model.view')],
    getById: [requirePermission('asset_model.view')],
    create: [requirePermission('asset_model.create')],
    update: [requirePermission('asset_model.update')],
    delete: false,
  }),
};
