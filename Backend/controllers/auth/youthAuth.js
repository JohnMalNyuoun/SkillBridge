const bcrypt = require('bcryptjs');
const User = require('../../models/Users');
const {
  AuthSessionConfigurationError,
  issueAuthTokens
} = require('../../services/authSessionService');
const { success, error } = require('../../utils/apiResponse');
const posthog = require('../../config/posthog');

// @desc    Register youth
// @route   POST /api/auth/youth/register
// @access  Public
const registerYouth = async (req, res) => {
  try {
    const { fullName, email, password, communityType, dateOfBirth, age, gender, phoneNumber } = req.body;

    // Check required fields
    if (!fullName || !email || !password || !communityType) {
      return error(res, 400, 'Please provide fullName, email, password and communityType');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error(res, 400, 'Email already registered');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const resolvedDateOfBirth = dateOfBirth
      ? new Date(dateOfBirth)
      : undefined;

    if (dateOfBirth && Number.isNaN(resolvedDateOfBirth.getTime())) {
      return error(res, 400, 'Invalid dateOfBirth value');
    }

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      communityType,
      dateOfBirth: resolvedDateOfBirth,
      ...(age !== undefined ? { age } : {}),
      gender,
      phoneNumber,
      isVerified: true
    });

    posthog.identify({
      distinctId: user._id.toString(),
      properties: {
        email: user.email,
        name: user.fullName,
        community_type: user.communityType,
        role: user.role,
        $set_once: { created_at: user.createdAt }
      }
    });
    posthog.capture({
      distinctId: user._id.toString(),
      event: 'youth registered',
      properties: {
        community_type: user.communityType,
        gender: user.gender
      }
    });

    const tokens = await issueAuthTokens(user, 'User', req);
    return success(res, 201, 'Account created successfully.', {
      ...tokens,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        photo: user.photo,
        communityType: user.communityType,
        role: user.role
      }
    });

  } catch (err) {
    if (err instanceof AuthSessionConfigurationError) {
      console.error('Refresh session configuration is incomplete:', err.message);
      return error(res, 503, 'Secure sign-in is temporarily unavailable');
    }
    return error(res, 500, err.message);
  }
};

// @desc    Login youth
// @route   POST /api/auth/youth/login
// @access  Public
const loginYouth = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return error(res, 400, 'Please provide email and password');
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return error(res, 401, 'Invalid email or password');
    }

    if (!user.isVerified && user.emailVerificationCodeHash) {
      return error(res, 403, 'Verify your email address before signing in.');
    }

    // Check if account is active
    if (!user.isActive) {
      return error(res, 403, 'Your account has been deactivated');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return error(res, 401, 'Invalid email or password');
    }

    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // Generate token
    const tokens = await issueAuthTokens(user, 'User', req);

    posthog.identify({
      distinctId: user._id.toString(),
      properties: {
        email: user.email,
        name: user.fullName,
        community_type: user.communityType,
        role: user.role
      }
    });
    posthog.capture({
      distinctId: user._id.toString(),
      event: 'youth logged in',
      properties: {
        login_count: user.loginCount
      }
    });

    return success(res, 200, 'Login successful', {
      ...tokens,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        photo: user.photo,
        communityType: user.communityType,
        role: user.role
      }
    });

  } catch (err) {
    if (err instanceof AuthSessionConfigurationError) {
      console.error('Refresh session configuration is incomplete:', err.message);
      return error(res, 503, 'Secure sign-in is temporarily unavailable');
    }
    return error(res, 500, err.message);
  }
};

module.exports = { registerYouth, loginYouth };
