import { Router } from 'express';
import prisma from '@/prisma.js';
import { BorrowWorkflowController } from '@/controllers/borrow-workflow.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requireAnyPermission, requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { PrismaAssetIssueRepository } from '@/repositories/asset-issue.prisma.repository.js';
import { PrismaVendorRepository } from '@/repositories/vendor.prisma.repository.js';
import { PrismaBorrowRequestRepository } from '@/repositories/borrow-request.prisma.repository.js';
import { AssetService } from '@/services/assets.service.js';
import { AssetIssueService } from '@/services/asset-issue.service.js';
import { BorrowWorkflowService } from '@/services/borrow-workflow.service.js';
import { PrismaNotificationRepository } from '@/repositories/notification.prisma.repository.js';
import { NotificationService } from '@/services/notification.service.js';
import { VendorService } from '@/services/vendor.service.js';

const router = Router();
const borrowRepository = new PrismaBorrowRequestRepository(prisma);
const assetService = new AssetService(new PrismaAssetRepository(prisma), prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const assetIssueService = new AssetIssueService(
  assetService,
  new PrismaAssetIssueRepository(prisma),
  new VendorService(new PrismaVendorRepository(prisma), prisma),
  notificationService,
  prisma,
);
const controller = new BorrowWorkflowController(
  new BorrowWorkflowService(
    borrowRepository,
    assetService,
    assetIssueService,
    notificationService,
    prisma,
  ),
);

router.get('/current', requireAuth, requirePermission('borrow_history.view_own'), controller.current);
router.get('/me', requireAuth, requirePermission('borrow_history.view_own'), controller.ownHistory);
router.get('/', requireAuth, requirePermission('borrow_history.view_all'), controller.allHistory);
router.get('/return-queue', requireAuth, requirePermission('asset.checkin'), controller.returnQueue);
router.get('/:historyId', requireAuth, requireAnyPermission('borrow_history.view_own', 'borrow_history.view_all'), controller.detail);
router.post('/:historyId/return-damaged', requireAuth, requirePermission('asset.checkin'), controller.returnDamaged);
router.post('/:historyId/return', requireAuth, requirePermission('asset.checkin'), controller.returnNormal);

export default { resource: 'borrow-histories', router };
