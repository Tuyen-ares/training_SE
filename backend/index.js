// backend/index.js
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bodyParser = express.json();
const { handleRegister, handleLogin } = require('./Controller/AuthController');
const { handleGetAllUser  } = require('./Controller/UserController');
const { verifyToken, authorizeRoles } = require('./middleware/Auth');
const app = express();
app.use(bodyParser);

app.post('/api/auth/register', handleRegister);
app.post('/api/auth/login', handleLogin);

app.get('/api/users', verifyToken, authorizeRoles(1), handleGetAllUser);
const port = process.env.PORT;
app.listen(port, () => console.log(`Server running on ${port}`));
