import { Router } from 'express';
import prisma from '@/prisma.js';
import { BorrowRequestController } from '@/controllers/borrow-request.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaBorrowRequestRepository } from '@/repositories/borrow-request.prisma.repository.js';
import { BorrowRequestService } from '@/services/borrow-request.service.js';
import { BorrowWorkflowController } from '@/controllers/borrow-workflow.controller.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { AssetService } from '@/services/assets.service.js';
import { BorrowWorkflowService } from '@/services/borrow-workflow.service.js';

const router = Router();
const repository = new PrismaBorrowRequestRepository(prisma);
const service = new BorrowRequestService(repository);
const controller = new BorrowRequestController(service);
const workflowController = new BorrowWorkflowController(
  new BorrowWorkflowService(repository, new AssetService(new PrismaAssetRepository(prisma))),
);

router.post('/', requireAuth, requirePermission('borrow_request.create'), controller.create);
router.get('/me', requireAuth, requirePermission('borrow_request.view_own'), controller.listMine);
router.post('/:requestId/approve-all', requireAuth, requirePermission('borrow_request.approve'), workflowController.approveAll);
router.post('/:requestId/cancel', requireAuth, requirePermission('borrow_request.cancel_own'), workflowController.withdraw);
router.get('/:requestId', requireAuth, requirePermission('borrow_request.view_own'), controller.getMine);

export default { resource: 'borrow-requests', router };
