import path from 'path';
import dotenv from 'dotenv';
import type { PrismaClient as PrismaClientType } from '../generated/prisma/index.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const { PrismaClient } = require(path.join(process.cwd(), 'generated/prisma')) as typeof import('../generated/prisma/index.js');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  allowPublicKeyRetrieval: true,
});

const prisma: PrismaClientType = new PrismaClient({ adapter });

export default prisma;
