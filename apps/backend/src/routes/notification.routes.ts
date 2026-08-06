import prisma from '@/prisma.js';
import { NotificationController } from '@/controllers/notification.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { PrismaNotificationRepository } from '@/repositories/notification.prisma.repository.js';
import { NotificationService } from '@/services/notification.service.js';
import { Router } from 'express';

const repository = new PrismaNotificationRepository(prisma);
const service = new NotificationService(repository);
const controller = new NotificationController(service);
const router = Router();

router.use(requireAuth);
router.get('/', controller.listOwn);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);

export default { resource: 'notifications', router };
