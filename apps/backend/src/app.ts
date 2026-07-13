import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ path: `${process.cwd()}/.env` });
import { registerRoutes } from '@/routes/index.js';


const app = express();
app.use(cors());
app.use(express.json());



app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

registerRoutes(app);

export default app;
