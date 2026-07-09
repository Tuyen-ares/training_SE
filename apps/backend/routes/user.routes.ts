import prisma from '@/prisma';
import UserRepository from '@/repositories/user.repository';
import UserService from '@/services/user.service';
import UserController from '@/controllers/user.controller';
import { createRestRouter } from '@/shared/rest-router';

const repo = new UserRepository(prisma);
const service = new UserService(repo);
const controller = new UserController(service);



export default {
  resource: 'users',
  router: createRestRouter(controller),
};
