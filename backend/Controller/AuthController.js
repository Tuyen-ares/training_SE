// backend/Controller/AuthController.js
const AuthService = require('../Services/AuthService');

const handleRegister = async (req, res) => {
  try {
    const { departmentId, roleId, name, password, phone, email } = req.body;
    const user = await AuthService.register({ departmentId, roleId, name, password, email, phone });
    return res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    if (err.code === 'EMAIL_IN_USE') {
      return res.status(400).json({ message: 'Email already in use' });
    }
    return res.status(500).json({ message: 'Server error'});
  }
};

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login( {   email, password });
    return res.status(200).json({
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    if (err.code === 'INVALID_EMAIL') {
      return res.status(401).json({ message: 'Invalid email' });
    }
    if (err.code === 'INVALID_PASSWORD') {
      return res.status(401).json({ message: 'Invalid password' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};


module.exports = { handleRegister, handleLogin };
