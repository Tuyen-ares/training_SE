import { Router } from 'express';
import prisma from '@/prisma.js';
import { VendorController } from '@/controllers/vendor.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { requirePermission } from '@/middleware/rbac.middleware.js';
import { PrismaVendorRepository } from '@/repositories/vendor.prisma.repository.js';
import { VendorService } from '@/services/vendor.service.js';

const repository = new PrismaVendorRepository(prisma);
const service = new VendorService(repository);
const controller = new VendorController(service);
const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('vendor.view'), controller.list);
router.get('/:id', requirePermission('vendor.view'), controller.getById);
router.post('/', requirePermission('vendor.create'), controller.create);
router.patch('/:id', requirePermission('vendor.update'), controller.update);

export default { resource: 'vendors', router };
