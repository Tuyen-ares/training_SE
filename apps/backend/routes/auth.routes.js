const express = require('express');
const { handleRegister, handleLogin } = require('../controllers/auth.controller');
const router = express.Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);

module.exports = router;
