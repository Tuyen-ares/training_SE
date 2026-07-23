import prisma from '@/prisma.js';
import AssetTypeController from '@/controllers/asset-type.controller.js';
import { requireAuth, requirePermission } from '@/middleware/auth.middleware.js';
import { PrismaAssetTypeRepository } from '@/repositories/asset-type.prisma.repository.js';
import { AssetTypeService } from '@/services/asset-type.service.js';
import { createRestRouter } from '@/shared/rest-router.js';

const repository = new PrismaAssetTypeRepository(prisma);
const service = new AssetTypeService(repository);
const controller = new AssetTypeController(service);

export default {
  resource: 'asset-types',
  router: createRestRouter(controller, {
    global: [requireAuth],
    getAll: [requirePermission('asset_type.view')],
    getById: [requirePermission('asset_type.view')],
    create: [requirePermission('asset_type.create')],
    update: [requirePermission('asset_type.update')],
    delete: [requirePermission('asset_type.delete')],
  }),
};
