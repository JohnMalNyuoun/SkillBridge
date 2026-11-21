const mongoose = require('mongoose');
const PushToken = require('../models/PushToken');
const RefreshSession = require('../models/RefreshSession');
const { success, error } = require('../utils/apiResponse');

const isAndroidRequest = (req) => (
  String(req.headers['x-client-platform'] || '').toLowerCase() === 'android'
);

const getAccountModel = (role) => (
  role === 'organisation' ? 'Organisation' : 'User'
);

const getAuthenticatedDeviceSession = async (req) => {
  if (!isAndroidRequest(req) || !mongoose.isObjectIdOrHexString(req.user?.sid)) {
    return null;
  }

  const accountModel = getAccountModel(req.user.role);
  const session = await RefreshSession.findOne({
    _id: req.user.sid,
    accountId: req.user.id,
    accountModel,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).select('_id');

  return session ? { accountModel, sessionId: session._id } : null;
};

const registerPushToken = async (req, res) => {
  try {
    const token = req.body?.token;
    if (typeof token !== 'string' || token.trim().length < 20 || token.length > 4096) {
      return error(res, 400, 'A valid Android push token is required.');
    }
    const normalizedToken = token.trim();

    const device = await getAuthenticatedDeviceSession(req);
    if (!device) return error(res, 401, 'A valid authenticated Android session is required.');

    await PushToken.deleteMany({
      refreshSessionId: device.sessionId,
      token: { $ne: normalizedToken }
    });
    await PushToken.findOneAndUpdate(
      { token: normalizedToken },
      {
        $set: {
          accountId: req.user.id,
          accountModel: device.accountModel,
          refreshSessionId: device.sessionId,
          token: normalizedToken,
          platform: 'android',
          lastSeenAt: new Date()
        }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return success(res, 200, 'Android push token registered.');
  } catch (err) {
    if (err.code === 11000) {
      return error(res, 409, 'This Android push token is already registered.');
    }
    console.error('Unable to register Android push token:', err.code || err.name);
    return error(res, 500, 'Unable to register Android push notifications.');
  }
};

const removePushToken = async (req, res) => {
  try {
    const device = await getAuthenticatedDeviceSession(req);
    if (!device) return error(res, 401, 'A valid authenticated Android session is required.');

    await PushToken.deleteMany({
      accountId: req.user.id,
      accountModel: device.accountModel,
      refreshSessionId: device.sessionId
    });
    return success(res, 200, 'Android push token removed.');
  } catch (err) {
    console.error('Unable to remove Android push token:', err.code || err.name);
    return error(res, 500, 'Unable to remove Android push notifications.');
  }
};

module.exports = { registerPushToken, removePushToken, getAuthenticatedDeviceSession };
