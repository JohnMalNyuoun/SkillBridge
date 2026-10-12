const jwt = require('jsonwebtoken');
const ShareEvent = require('../models/ShareEvent');
const { success, error } = require('../utils/apiResponse');

const ALLOWED_ENTITY_TYPES = ['course', 'organisation', 'youth', 'broadcast', 'page', 'other'];

// @desc    Record a share event
// @route   POST /api/track/share
// @access  Public (soft auth - records actor if token is present)
const trackShare = async (req, res) => {
  try {
    const { entityType, entityId, target, url } = req.body || {};

    const resolvedType = ALLOWED_ENTITY_TYPES.includes(entityType) ? entityType : 'other';

    let sharedBy = null;
    let sharedByModel = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id && decoded?.role) {
          sharedBy = decoded.id;
          sharedByModel = decoded.role === 'organisation' ? 'Organisation' : 'User';
        }
      } catch (_) {
        // Ignore invalid tokens — anonymous share is still tracked.
      }
    }

    const event = await ShareEvent.create({
      sharedBy,
      sharedByModel,
      entityType: resolvedType,
      entityId: entityId ? String(entityId).slice(0, 200) : null,
      target: target ? String(target).slice(0, 60) : 'unknown',
      url: url ? String(url).slice(0, 500) : null
    });

    return success(res, 201, 'Share recorded', { id: event._id });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = { trackShare };
