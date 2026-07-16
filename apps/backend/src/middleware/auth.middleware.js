const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const roleIds = Array.isArray(req.user.roleIds) ? req.user.roleIds : [];
    if (!allowedRoles.some((roleId) => roleIds.includes(roleId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
};

const authorizePermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const permissionCodes = Array.isArray(req.user.permissionCodes)
      ? req.user.permissionCodes
      : [];
    const hasAllPermissions = requiredPermissions.every((permission) =>
      permissionCodes.includes(permission),
    );

    if (!hasAllPermissions) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
};

module.exports = { verifyToken, authorizeRoles, authorizePermissions };
