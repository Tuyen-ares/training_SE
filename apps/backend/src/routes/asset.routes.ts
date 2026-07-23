import prisma from '@/prisma.js';
import AssetController from '@/controllers/asset.controller.js';
import { requireAuth, requirePermission } from '@/middleware/auth.middleware.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { AssetService } from '@/services/assets.service.js';
import { ApiResponse } from '@/shared/api-response.js';
import { createRestRouter } from '@/shared/rest-router.js';
import type { RequestHandler } from 'express';

const repository = new PrismaAssetRepository(prisma);
const service = new AssetService(repository);
const controller = new AssetController(service);
const requirePositiveAssetId: RequestHandler = (req, res, next): void => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    ApiResponse.badRequest(res, {
      id: ['Asset id must be a positive integer'],
    });
    return;
  }
  next();
};

const router = createRestRouter(controller, {
  global: [requireAuth],
  getAll: [requirePermission('asset.view')],
  getById: [requirePermission('asset.view'), requirePositiveAssetId],
  create: [requirePermission('asset.create')],
  update: [requirePermission('asset.update'), requirePositiveAssetId],
  delete: [requirePermission('asset.delete'), requirePositiveAssetId],
});

router.post(
  '/:id/report-damaged',
  requireAuth,
  requirePermission('asset.update'),
  requirePositiveAssetId,
  controller.reportDamaged,
);

export default {
  resource: 'assets',
  router,
};
