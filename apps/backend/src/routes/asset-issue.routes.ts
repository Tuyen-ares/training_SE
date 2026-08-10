import { Router } from 'express';
import prisma from '@/prisma.js';
import { AssetIssueController } from '@/controllers/asset-issue.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaAssetIssueRepository } from '@/repositories/asset-issue.prisma.repository.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { PrismaNotificationRepository } from '@/repositories/notification.prisma.repository.js';
import { AssetIssueService } from '@/services/asset-issue.service.js';

const issueRepository = new PrismaAssetIssueRepository(prisma);
const assetRepository = new PrismaAssetRepository(prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const service = new AssetIssueService(assetRepository, issueRepository, notificationRepository);
const controller = new AssetIssueController(service);
const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('asset_issue.view'), controller.list);
router.get('/:id', requirePermission('asset_issue.view'), controller.getById);
router.post('/:id/confirm', requirePermission('asset_issue.update'), controller.confirm);
router.post('/:id/reject', requirePermission('asset_issue.update'), controller.reject);
router.post('/:id/start-repair', requirePermission('asset_issue.create'), controller.startRepair);
router.patch('/:id/repair', requirePermission('asset_issue.update'), controller.updateRepair);
router.post('/:id/complete', requirePermission('asset_issue.close'), controller.complete);
router.post('/:id/fail', requirePermission('asset_issue.close'), controller.fail);

export default { resource: 'asset-issues', router };
