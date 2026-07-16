import express from 'express';
import prisma from '@/prisma.js';
import { PrismaAuthRepository } from '@/repositories/auth.prisma.repository.js';
import { AuthService } from '@/services/auth.service.js';
import AuthController from '@/controllers/auth.controller.js';

const router = express.Router();
const repo = new PrismaAuthRepository(prisma);
const service = new AuthService(repo);
const controller = new AuthController(service);

router.post('/register', controller.handleRegister);
router.post('/login', controller.handleLogin);

export default {
  resource: 'auth',
  router,
};

