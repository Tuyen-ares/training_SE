import { Router } from 'express';
import prisma from '@/prisma.js';
import { BorrowRequestController } from '@/controllers/borrow-request.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaBorrowRequestRepository } from '@/repositories/borrow-request.prisma.repository.js';
import { BorrowRequestService } from '@/services/borrow-request.service.js';
import { BorrowWorkflowController } from '@/controllers/borrow-workflow.controller.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { PrismaAssetIssueRepository } from '@/repositories/asset-issue.prisma.repository.js';
import { PrismaVendorRepository } from '@/repositories/vendor.prisma.repository.js';
import { AssetService } from '@/services/assets.service.js';
import { AssetIssueService } from '@/services/asset-issue.service.js';
import { BorrowWorkflowService } from '@/services/borrow-workflow.service.js';
import { PrismaNotificationRepository } from '@/repositories/notification.prisma.repository.js';
import { NotificationService } from '@/services/notification.service.js';
import { VendorService } from '@/services/vendor.service.js';

const router = Router();
const repository = new PrismaBorrowRequestRepository(prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const assetService = new AssetService(new PrismaAssetRepository(prisma), prisma);
const assetIssueService = new AssetIssueService(
  assetService,
  new PrismaAssetIssueRepository(prisma),
  new VendorService(new PrismaVendorRepository(prisma), prisma),
  notificationService,
  prisma,
);
const service = new BorrowRequestService(repository, notificationService, prisma);
const controller = new BorrowRequestController(service);
const workflowController = new BorrowWorkflowController(
  new BorrowWorkflowService(
    repository,
    assetService,
    assetIssueService,
    notificationService,
    prisma,
  ),
);

router.post('/', requireAuth, requirePermission('borrow_request.create'), controller.create);
router.get('/me', requireAuth, requirePermission('borrow_request.view_own'), controller.listMine);
router.post('/:requestId/approve-all', requireAuth, requirePermission('borrow_request.approve'), workflowController.approveAll);
router.post('/:requestId/cancel', requireAuth, requirePermission('borrow_request.cancel_own'), workflowController.withdraw);
router.get('/:requestId', requireAuth, requirePermission('borrow_request.view_own'), controller.getMine);

export default { resource: 'borrow-requests', router };
