import { Router } from 'express';
import prisma from '@/prisma.js';
import { BorrowWorkflowController } from '@/controllers/borrow-workflow.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { PrismaBorrowRequestRepository } from '@/repositories/borrow-request.prisma.repository.js';
import { AssetService } from '@/services/assets.service.js';
import { BorrowWorkflowService } from '@/services/borrow-workflow.service.js';
import { PrismaNotificationRepository } from '@/repositories/notification.prisma.repository.js';

const router = Router();
const borrowRepository = new PrismaBorrowRequestRepository(prisma);
const assetService = new AssetService(new PrismaAssetRepository(prisma));
const notificationRepository = new PrismaNotificationRepository(prisma);
const controller = new BorrowWorkflowController(
  new BorrowWorkflowService(borrowRepository, assetService, notificationRepository),
);

router.get('/review-queue', requireAuth, requirePermission('borrow_request.view_all'), controller.reviewQueue);
router.get('/review-queue/:requestId', requireAuth, requirePermission('borrow_request.view_all'), controller.reviewDetail);
router.post('/:detailId/approve', requireAuth, requirePermission('borrow_request.approve'), controller.approve);
router.post('/:detailId/reject', requireAuth, requirePermission('borrow_request.reject'), controller.reject);
router.post('/:detailId/handover', requireAuth, requirePermission('asset.checkout'), controller.handover);

export default { resource: 'borrow-request-details', router };
