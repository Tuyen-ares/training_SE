import prisma from '@/prisma';
import UserRepository from '@/repositories/user.repo';
import UserService from '@/services/user.service';
import UserController from '@/controllers/user.controller';
import { Router } from 'express';

const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

const routes = Router();
routes.get('/', userController.handleGetAllUser);
routes.get('/:id', userController.handleGetUserById);

export default {
  resource: 'users',
  router: routes,
};
