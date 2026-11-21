const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../models/Users');
const Organisation = require('../../models/Organisation');
const generateToken = require('../../utils/generateToken');
const {
  AuthSessionConfigurationError,
  issueAuthTokens
} = require('../../services/authSessionService');
const { success, error } = require('../../utils/apiResponse');
const posthog = require('../../config/posthog');
const {
  GoogleAuthConfigurationError,
  verifyGoogleIdToken
} = require('../../services/googleAuth');

const isGmailAddress = (email) => /@(gmail\.com|googlemail\.com)$/i.test(email);

const createGoogleAuthHandler = ({
  UserModel = User,
  OrganisationModel = Organisation,
  verifyIdToken = verifyGoogleIdToken,
  createToken = generateToken,
  analytics = posthog
} = {}) => async (req, res) => {
  const { idToken } = req.body || {};
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 8192) {
    return error(res, 400, 'A valid Google ID token is required');
  }

  let googleUser;
  try {
    googleUser = await verifyIdToken(idToken);
  } catch (err) {
    if (err instanceof GoogleAuthConfigurationError) {
      console.error('Google authentication is not configured:', err.message);
      return error(res, 503, 'Google sign-in is temporarily unavailable');
    }

    return error(res, 401, 'Google ID token is invalid or expired');
  }

  if (
    !googleUser ||
    typeof googleUser.sub !== 'string' ||
    typeof googleUser.email !== 'string' ||
    googleUser.email_verified !== true
  ) {
    return error(res, 401, 'A verified Google email is required');
  }

  const email = googleUser.email.trim().toLowerCase();
  let user;

  try {
    user = await UserModel.findOne({ googleId: googleUser.sub });

    if (!user) {
      const emailUser = await UserModel.findOne({ email });
      const existingOrganisation = await OrganisationModel.findOne({ email });
      if (emailUser && existingOrganisation) {
        return error(res, 409, 'Multiple accounts already use this email. Contact support to resolve the account conflict.');
      }

      if (emailUser) {
        if (!isGmailAddress(email) || emailUser.isVerified !== true) {
          return error(res, 409, 'An account already uses this email. Sign in with your existing account first.');
        }

        emailUser.googleId = googleUser.sub;
        user = emailUser;
      } else {
        if (existingOrganisation) {
          return error(res, 409, 'An account already uses this email. Contact support to resolve the account conflict.');
        }

        const unusablePassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        user = new UserModel({
          email,
          fullName: googleUser.name?.trim() || email.split('@')[0],
          password: unusablePassword,
          googleId: googleUser.sub,
          isVerified: true,
          role: 'youth'
        });
      }
    }

    if (!user.isActive) {
      return error(res, 403, 'Your account has been deactivated');
    }
    if (user.isSuspended) {
      return error(res, 403, 'Your account has been suspended');
    }

    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const tokens = await issueAuthTokens(user, 'User', req, { createToken });
    analytics.identify({
      distinctId: user._id.toString(),
      properties: {
        email: user.email,
        name: user.fullName,
        community_type: user.communityType,
        role: user.role
      }
    });
    analytics.capture({
      distinctId: user._id.toString(),
      event: 'youth logged in with google',
      properties: { login_count: user.loginCount }
    });

    return success(res, 200, 'Login successful', {
      ...tokens,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        photo: user.photo,
        communityType: user.communityType || null,
        role: user.role
      }
    });
  } catch (err) {
    if (err instanceof AuthSessionConfigurationError) {
      console.error('Refresh session configuration is incomplete:', err.message);
      return error(res, 503, 'Secure sign-in is temporarily unavailable');
    }
    if (err && err.code === 11000) {
      return error(res, 409, 'An account already uses this email. Sign in with the linked account.');
    }

    console.error('Google authentication failed:', err);
    return error(res, 500, 'Google sign-in failed');
  }
};

module.exports = { createGoogleAuthHandler };
