import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';


dotenv.config({ path: path.join(__dirname, '.env') });

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
