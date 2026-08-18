import prisma from '@/prisma.js';
import AssetController from '@/controllers/asset.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { PrismaAssetIssueRepository } from '@/repositories/asset-issue.prisma.repository.js';
import { PrismaVendorRepository } from '@/repositories/vendor.prisma.repository.js';
import { PrismaNotificationRepository } from '@/repositories/notification.prisma.repository.js';
import { AssetIssueService } from '@/services/asset-issue.service.js';
import { AssetService } from '@/services/assets.service.js';
import { NotificationService } from '@/services/notification.service.js';
import { VendorService } from '@/services/vendor.service.js';
import { MediaService } from '@/services/media.service.js';
import { S3MediaStorage } from '@/services/media-storage.service.js';
import { PrismaMediaRepository } from '@/repositories/media.prisma.repository.js';
import { ApiResponse } from '@/shared/api-response.js';
import { createRestRouter } from '@/shared/rest-router.js';
import type { RequestHandler } from 'express';

const repository = new PrismaAssetRepository(prisma);
const issueRepository = new PrismaAssetIssueRepository(prisma);
const vendorRepository = new PrismaVendorRepository(prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const mediaService = new MediaService(new PrismaMediaRepository(prisma), new S3MediaStorage(), prisma);
const service = new AssetService(repository, prisma, mediaService);
const issueService = new AssetIssueService(
  service,
  issueRepository,
  new VendorService(vendorRepository, prisma),
  notificationService,
  prisma,
);
const controller = new AssetController(service, issueService);
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
  delete: false,
});

router.post(
  '/:id/report-damaged',
  requireAuth,
  requirePositiveAssetId,
  controller.reportDamaged,
);

router.get(
  '/by-qr/:qrCode',
  requireAuth,
  requirePermission('asset.view'),
  controller.getByQr,
);
router.post(
  '/:id/retire',
  requireAuth,
  requirePositiveAssetId,
  requirePermission('asset.delete'),
  controller.retire,
);
export default {
  resource: 'assets',
  router,
};
