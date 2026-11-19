const jwt = require('jsonwebtoken');
const { error } = require('../utils/apiResponse');
const User = require('../models/Users');

const userRoles = new Set(['youth', 'trainee', 'staff', 'org_admin', 'admin']);

const notSuspended = async (req, res, next) => {
  if (!req.user || !userRoles.has(req.user.role)) {
    return next();
  }

  try {
    const user = await User.findById(req.user.id).select('isSuspended');
    if (user && user.isSuspended) {
      return error(res, 403, 'Your account has been suspended.');
    }

    return next();
  } catch (err) {
    return error(res, 500, 'Unable to verify account status.');
  }
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return error(res, 401, 'Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return notSuspended(req, res, next);
  } catch (err) {
    return error(res, 401, 'Not authorized, token failed');
  }
};

module.exports = { protect, notSuspended };