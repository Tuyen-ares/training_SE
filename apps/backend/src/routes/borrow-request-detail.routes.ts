import { Router } from 'express';
import prisma from '@/prisma.js';
import { BorrowWorkflowController } from '@/controllers/borrow-workflow.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { PrismaAssetIssueRepository } from '@/repositories/asset-issue.prisma.repository.js';
import { PrismaVendorRepository } from '@/repositories/vendor.prisma.repository.js';
import { PrismaBorrowRequestRepository } from '@/repositories/borrow-request.prisma.repository.js';
import { PrismaMediaRepository } from '@/repositories/media.prisma.repository.js';
import { AssetService } from '@/services/assets.service.js';
import { AssetIssueService } from '@/services/asset-issue.service.js';
import { BorrowWorkflowService } from '@/services/borrow-workflow.service.js';
import { PrismaNotificationRepository } from '@/repositories/notification.prisma.repository.js';
import { NotificationService } from '@/services/notification.service.js';
import { VendorService } from '@/services/vendor.service.js';
import { S3MediaStorage } from '@/services/media-storage.service.js';
import { MediaService } from '@/services/media.service.js';

const router = Router();
const borrowRepository = new PrismaBorrowRequestRepository(prisma);
const assetService = new AssetService(new PrismaAssetRepository(prisma), prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const mediaService = new MediaService(
  new PrismaMediaRepository(prisma),
  new S3MediaStorage(),
  prisma,
);
const assetIssueService = new AssetIssueService(
  assetService,
  new PrismaAssetIssueRepository(prisma),
  new VendorService(new PrismaVendorRepository(prisma), prisma),
  notificationService,
  prisma,
  mediaService,
);
const controller = new BorrowWorkflowController(
  new BorrowWorkflowService(
    borrowRepository,
    assetService,
    assetIssueService,
    notificationService,
    prisma,
    mediaService,
  ),
);

router.get('/handover-queue', requireAuth, requirePermission('asset.checkout'), controller.handoverQueue);
router.get('/review-queue', requireAuth, requirePermission('borrow_request.view_all'), controller.reviewQueue);
router.get('/review-queue/:requestId', requireAuth, requirePermission('borrow_request.view_all'), controller.reviewDetail);
router.post('/:detailId/approve', requireAuth, requirePermission('borrow_request.approve'), controller.approve);
router.post('/:detailId/reject', requireAuth, requirePermission('borrow_request.reject'), controller.reject);
router.post('/:detailId/handover', requireAuth, requirePermission('asset.checkout'), controller.handover);

export default { resource: 'borrow-request-details', router };
