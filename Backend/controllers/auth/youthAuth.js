const bcrypt = require('bcryptjs');
const User = require('../../models/Users');
const generateToken = require('../../utils/generateToken');
const { success, error } = require('../../utils/apiResponse');
const posthog = require('../../config/posthog');
const { sendCode } = require('../../services/verificationCodeService');

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
      phoneNumber
    });

    try {
      await sendCode(user, 'emailVerification');
    } catch (mailError) {
      await user.deleteOne();
      throw mailError;
    }

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

    return success(res, 201, 'A six-digit verification code was sent to your email address.', {
      email: user.email,
      accountType: 'youth'
    });

  } catch (err) {
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
    const token = generateToken(user._id, user.role);

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
      token,
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
    return error(res, 500, err.message);
  }
};

module.exports = { registerYouth, loginYouth };
