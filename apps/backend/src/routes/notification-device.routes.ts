import { Router } from 'express';
import prisma from '@/prisma.js';
import { NotificationDeviceController } from '@/controllers/notification-device.controller.js';
import { requireAuth } from '@/middleware/auth.middleware.js';
import { PrismaNotificationDeviceRepository } from '@/repositories/notification-device.prisma.repository.js';
import { NotificationDeviceService } from '@/services/notification-device.service.js';

const repository = new PrismaNotificationDeviceRepository(prisma);
const service = new NotificationDeviceService(repository);
const controller = new NotificationDeviceController(service);
const router = Router();

router.use(requireAuth);
router.get('/', controller.listOwn);
router.post('/', controller.register);
router.delete('/:id', controller.remove);

export default { resource: 'notification-devices', router };
