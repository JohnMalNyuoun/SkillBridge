const { error } = require('../utils/apiResponse');

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return error(res, 403, 'Access denied. Admins only.');
  }
};

module.exports = { isAdmin };