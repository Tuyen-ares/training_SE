import express from 'express';
import prisma from '@/prisma.js';
import { PrismaAuthRepository } from '@/repositories/auth.prisma.repository.js';
import { PrismaRefreshTokenRepository } from '@/repositories/refresh-token.prisma.repository.js';
import { AuthService } from '@/services/auth.service.js';
import { SessionService } from '@/services/session.service.js';
import { TokenService } from '@/services/token.service.js';
import AuthController from '@/controllers/auth.controller.js';

const router = express.Router();
const authRepository = new PrismaAuthRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const sessionService = new SessionService(refreshTokenRepository);
const tokenService = new TokenService();
const service = new AuthService(
  authRepository,
  refreshTokenRepository,
  tokenService,
  sessionService,
);
const controller = new AuthController(service);

router.post('/login', controller.handleLogin);
router.post('/refresh', controller.handleRefresh);
router.post('/logout', controller.handleLogout);

export default {
  resource: 'auth',
  router,
};
