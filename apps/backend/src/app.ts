import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/.env` });
import { registerRoutes } from '@/routes/index.js';
import { mountSwagger } from '@/swagger.js';

const app = express();
const configuredFrontendOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedFrontendOrigins = new Set(
  configuredFrontendOrigins.length
    ? configuredFrontendOrigins
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedFrontendOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

mountSwagger(app);

registerRoutes(app);

export default app;
