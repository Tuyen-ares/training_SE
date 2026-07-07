// backend/index.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { handleGetAllUser  } = require('./controllers/UserController');
const { verifyToken, authorizeRoles } = require('./middleware/Auth');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/auth/', require('./routes/auth.routes'));


app.get('/api/users', verifyToken, authorizeRoles(1), handleGetAllUser);


export = app;
