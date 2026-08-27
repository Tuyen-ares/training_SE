import { Router } from 'express';
import prisma from '@/prisma.js';
import { AssetIssueController } from '@/controllers/asset-issue.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaAssetIssueRepository } from '@/repositories/asset-issue.prisma.repository.js';
import { PrismaAssetRepository } from '@/repositories/asset.prisma.repository.js';
import { PrismaVendorRepository } from '@/repositories/vendor.prisma.repository.js';
import { PrismaMediaRepository } from '@/repositories/media.prisma.repository.js';
import { AssetIssueService } from '@/services/asset-issue.service.js';
import { AssetService } from '@/services/assets.service.js';
import { domainEventWriter } from '@/notifications/composition.js';
import { VendorService } from '@/services/vendor.service.js';
import { S3MediaStorage } from '@/services/media-storage.service.js';
import { MediaService } from '@/services/media.service.js';

const issueRepository = new PrismaAssetIssueRepository(prisma);
const assetRepository = new PrismaAssetRepository(prisma);
const assetService = new AssetService(assetRepository, prisma);
const mediaService = new MediaService(
  new PrismaMediaRepository(prisma),
  new S3MediaStorage(),
  prisma,
);
const service = new AssetIssueService(
  assetService,
  issueRepository,
  new VendorService(new PrismaVendorRepository(prisma), prisma),
  domainEventWriter,
  prisma,
  mediaService,
);
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
