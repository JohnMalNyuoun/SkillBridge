const { success, error } = require('../../utils/apiResponse');
const {
  AuthSessionError,
  AuthSessionConfigurationError,
  isNativeAndroidRequest,
  issueAuthTokens,
  refreshAuthSession,
  revokeAuthSession,
  getRefreshSessionId
} = require('../../services/authSessionService');
const User = require('../../models/Users');
const Organisation = require('../../models/Organisation');
const PushToken = require('../../models/PushToken');

const serializeAccount = (account, accountModel) => {
  if (accountModel === 'Organisation') {
    return {
      organisation: {
        id: account._id,
        name: account.name,
        email: account.email,
        type: account.type,
        status: account.status,
        role: account.role
      }
    };
  }

  return {
    user: {
      id: account._id,
      fullName: account.fullName,
      email: account.email,
      photo: account.photo,
      communityType: account.communityType || null,
      role: account.role
    }
  };
};

const refreshSession = async (req, res) => {
  try {
    const result = await refreshAuthSession(req.body?.refreshToken);
    return success(res, 200, 'Session refreshed', {
      token: result.token,
      refreshToken: result.refreshToken,
      ...serializeAccount(result.account, result.accountModel)
    });
  } catch (err) {
    if (err instanceof AuthSessionConfigurationError) {
      console.error('Refresh session configuration is incomplete:', err.message);
      return error(res, 503, 'Secure sign-in is temporarily unavailable');
    }
    if (err instanceof AuthSessionError) {
      if (err.code === 'ACCOUNT_DISABLED') {
        return error(res, 403, 'Your account is not available for sign-in');
      }
      if (err.code === 'REFRESH_TOKEN_REUSE') {
        console.warn('A rotated refresh token was reused; the device session was revoked.');
      }
      return error(res, 401, 'Your saved session has expired. Please sign in again.');
    }

    console.error('Unable to refresh authentication session:', err);
    return error(res, 500, 'Could not refresh your session');
  }
};

const migrateSession = async (req, res) => {
  if (!isNativeAndroidRequest(req)) {
    return error(res, 403, 'Only the native Android app can migrate a saved session');
  }

  try {
    const accountModel = req.user.role === 'organisation' ? 'Organisation' : 'User';
    const Model = accountModel === 'Organisation' ? Organisation : User;
    const account = await Model.findById(req.user.id);
    if (!account) return error(res, 401, 'Your saved session is no longer valid');
    if (
      account.isActive === false
      || (accountModel === 'User' && account.isSuspended === true)
      || (
        accountModel === 'Organisation'
        && ['pending', 'rejected', 'suspended'].includes(account.status)
      )
    ) {
      return error(res, 403, 'Your account is not available for sign-in');
    }

    const tokens = await issueAuthTokens(account, accountModel, req);
    return success(res, 200, 'Session secured', {
      ...tokens,
      ...serializeAccount(account, accountModel)
    });
  } catch (err) {
    if (err instanceof AuthSessionConfigurationError) {
      console.error('Refresh session configuration is incomplete:', err.message);
      return error(res, 503, 'Secure sign-in is temporarily unavailable');
    }
    console.error('Unable to secure the existing Android session:', err);
    return error(res, 500, 'Could not secure your session');
  }
};

const logoutSession = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken;
    const sessionId = getRefreshSessionId(refreshToken);
    await revokeAuthSession(refreshToken);
    if (sessionId) {
      await PushToken.deleteMany({ refreshSessionId: sessionId });
    }
    return success(res, 200, 'Session revoked');
  } catch (err) {
    if (err instanceof AuthSessionConfigurationError) {
      console.error('Refresh session configuration is incomplete:', err.message);
      return error(res, 503, 'Secure sign-out is temporarily unavailable');
    }
    console.error('Unable to revoke authentication session:', err);
    return error(res, 500, 'Could not revoke your session');
  }
};

module.exports = { refreshSession, migrateSession, logoutSession, serializeAccount };
