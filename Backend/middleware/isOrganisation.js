const { error } = require('../utils/apiResponse');
const Organisation = require('../models/Organisation');

const isOrganisation = async (req, res, next) => {
  if (req.user && req.user.role === 'organisation') {
    return next();
  }

  try {
    if (req.user?.id) {
      const org = await Organisation.findById(req.user.id).select('role isActive status');

      // Backward compatibility for tokens that may not carry role correctly.
      if (org && org.role === 'organisation' && org.isActive && org.status === 'approved') {
        req.user.role = 'organisation';
        return next();
      }
    }
  } catch (err) {
    return error(res, 500, 'Authorization check failed');
  }

  return error(res, 403, 'Access denied. Organisations only.');
};

module.exports = { isOrganisation };