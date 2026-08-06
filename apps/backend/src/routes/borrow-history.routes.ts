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

router.get('/current', requireAuth, requirePermission('borrow_history.view_own'), controller.current);
router.get('/me', requireAuth, requirePermission('borrow_history.view_own'), controller.ownHistory);
router.get('/', requireAuth, requirePermission('borrow_history.view_all'), controller.allHistory);
router.post('/:historyId/return', requireAuth, requirePermission('asset.checkin'), controller.returnNormal);

export default { resource: 'borrow-histories', router };
