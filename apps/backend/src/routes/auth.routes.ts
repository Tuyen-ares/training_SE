import express from 'express';
import prisma from '@/prisma.js';
import { PrismaAuthRepository } from '@/repositories/auth.prisma.repository.js';
import { PrismaRefreshTokenRepository } from '@/repositories/refresh-token.prisma.repository.js';
import { PrismaRbacRepository } from '@/repositories/rbac.prisma.repository.js';
import { PrismaUserRepository } from '@/repositories/user.prisma.repository.js';
import { AuthService } from '@/services/auth.service.js';
import { RbacService } from '@/services/rbac.service.js';
import { SessionService } from '@/services/session.service.js';
import { TokenService } from '@/services/token.service.js';
import { UserService } from '@/services/user.service.js';
import AuthController from '@/controllers/auth.controller.js';

const router = express.Router();
const authRepository = new PrismaAuthRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const rbacRepository = new PrismaRbacRepository(prisma);
const rbacService = new RbacService(rbacRepository);
const sessionService = new SessionService(refreshTokenRepository);
const userService = new UserService(
  userRepository,
  rbacService,
  sessionService,
  prisma,
);
const tokenService = new TokenService();
const service = new AuthService(
  authRepository,
  refreshTokenRepository,
  tokenService,
  userService,
  sessionService,
);
const controller = new AuthController(service);

router.post('/register', controller.handleRegister);
router.post('/login', controller.handleLogin);
router.post('/refresh', controller.handleRefresh);
router.post('/logout', controller.handleLogout);

export default {
  resource: 'auth',
  router,
};
