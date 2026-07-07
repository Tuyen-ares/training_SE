import express from 'express';
import cors from 'cors';
import { handleGetAllUser } from './controllers/UserController';

require('dotenv').config({ path: `${process.cwd()}/.env` });

const app = express();
app.use(cors());
app.use(express.json());

//app.post('/auth/', require('./routes/auth.routes'));


app.get('/api/users', handleGetAllUser);


export default app;
