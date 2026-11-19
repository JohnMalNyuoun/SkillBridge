const User = require('../models/Users');
const Organisation = require('../models/Organisation');
const { error } = require('../utils/apiResponse');

const isOrgAdmin = async (req, res, next) => {
  try {
    if (req.user?.role === 'organisation') {
      const organisation = await Organisation.findById(req.user.id).select('isActive status');
      if (!organisation || !organisation.isActive || organisation.status !== 'approved') {
        return error(res, 403, 'Your organisation is not active and approved.');
      }

      req.organizationId = organisation._id;
      return next();
    }

    const user = await User.findById(req.user?.id).select('role createdByOrg isSuspended');

    if (!user || user.role !== 'org_admin') {
      return error(res, 403, 'Access denied. Organisation administrators only.');
    }

    if (user.isSuspended) {
      return error(res, 403, 'Your account has been suspended.');
    }

    if (!user.createdByOrg) {
      return error(res, 403, 'Your account is not associated with an organisation.');
    }

    const organisation = await Organisation.findById(user.createdByOrg).select('isActive status');
    if (!organisation || !organisation.isActive || organisation.status !== 'approved') {
      return error(res, 403, 'Your organisation is not active and approved.');
    }

    req.organizationId = user.createdByOrg;
    return next();
  } catch (err) {
    return error(res, 500, 'Unable to verify organisation administrator access.');
  }
};

module.exports = { isOrgAdmin };
