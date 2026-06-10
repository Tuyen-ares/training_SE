const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const salt = bcrypt.genSaltSync(10);

const hashUserPassword = async (userPassword) => {
  let hashPassword = await bcrypt.hash(userPassword, salt);
  return hashPassword;
};

const createAuthError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const register = async ({ departmentId, roleId, name, password, email, phone }) => {
  const existing = await prisma.users.findFirst({ where: { email } });
  if (existing) {
    throw createAuthError('EMAIL_IN_USE', 'Email already in use');
  }

  const hashPass = await hashUserPassword(password);

  const users = await prisma.users.create({
    data: {
      department_id: departmentId ?? null,
      role_id: roleId ?? null,
      name: name,
      email: email,
      phone: phone,
      password: hashPass
    }
  });
  return users;
};

const login = async ({ email, password }) => {
  const user = await prisma.users.findFirst({
    where: { email },
    include: {
      department: true,
      roles: true,
    },
  });

  if (!user) {
    throw createAuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw createAuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roleId: user.role_id,
      departmentId: user.department_id,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      roles: user.roles,
    },
  };
};

module.exports = { register, login };
