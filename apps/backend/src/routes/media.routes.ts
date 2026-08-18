import { Router } from 'express';
import prisma from '@/prisma.js';
import { MediaController } from '@/controllers/media.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { PrismaMediaRepository } from '@/repositories/media.prisma.repository.js';
import { MediaService } from '@/services/media.service.js';
import { S3MediaStorage } from '@/services/media-storage.service.js';

const repository = new PrismaMediaRepository(prisma);
const service = new MediaService(repository, new S3MediaStorage(), prisma);
const controller = new MediaController(service);
const router = Router();

router.use(requireAuth);
router.post('/presign', controller.presign);
router.post('/:mediaId/complete', controller.complete);
router.delete('/:mediaId', controller.cancel);

export default { resource: 'media', router };
