const { error } = require('../utils/apiResponse');

const isYouth = (req, res, next) => {
  if (req.user && req.user.role === 'youth') {
    next();
  } else {
    return error(res, 403, 'Access denied. Youth only.');
  }
};

module.exports = { isYouth };