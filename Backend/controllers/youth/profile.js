const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../models/Users');
const { success, error } = require('../../utils/apiResponse');
const { deleteImage, uploadImage } = require('../../services/mongodbImageService');
const { sendEmail, hasEmailConfig } = require('../../services/emailService');
const { sendCode, verifyCode } = require('../../services/verificationCodeService');
const NAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

// @desc    Get youth profile
// @route   GET /api/youth/profile
// @access  Youth
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return error(res, 404, 'User not found');
    return success(res, 200, 'Profile fetched', user);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update youth profile
// @route   PUT /api/youth/profile
// @access  Youth
const updateProfile = async (req, res) => {
  try {
    const { fullName, username, dateOfBirth, gender, phoneNumber, bio, visibilitySettings } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    if (username !== undefined) {
      const normalized = String(username).toLowerCase().trim();

      if (normalized.length === 0) {
        user.username = undefined;
      } else if (normalized.length < 3) {
        return error(res, 400, 'Username must be at least 3 characters');
      } else {
        const existing = await User.findOne({ username: normalized, _id: { $ne: req.user.id } });
        if (existing) {
          return error(res, 400, 'Username is already taken');
        }
        user.username = normalized;
      }
    }

    if (fullName !== undefined) {
      const normalizedFullName = String(fullName).trim();
      if (normalizedFullName && normalizedFullName !== user.fullName) {
        return error(res, 400, 'Name can only be changed from Account settings');
      }
    }
    if (dateOfBirth !== undefined) {
      const parsedDate = dateOfBirth ? new Date(dateOfBirth) : undefined;
      if (dateOfBirth && Number.isNaN(parsedDate.getTime())) {
        return error(res, 400, 'Invalid dateOfBirth value');
      }
      user.dateOfBirth = parsedDate;
    }
    if (gender) user.gender = gender;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (bio !== undefined) user.bio = bio;

    if (visibilitySettings && typeof visibilitySettings === 'object') {
      const allowed = ['public', 'mutual', 'private'];
      const next = { ...(user.visibilitySettings || {}) };

      if (visibilitySettings.dateOfBirth !== undefined) {
        if (!allowed.includes(visibilitySettings.dateOfBirth)) {
          return error(res, 400, 'Invalid dateOfBirth visibility');
        }
        next.dateOfBirth = visibilitySettings.dateOfBirth;
      }
      if (visibilitySettings.email !== undefined) {
        if (!allowed.includes(visibilitySettings.email)) {
          return error(res, 400, 'Invalid email visibility');
        }
        next.email = visibilitySettings.email;
      }
      if (visibilitySettings.phoneNumber !== undefined) {
        if (!allowed.includes(visibilitySettings.phoneNumber)) {
          return error(res, 400, 'Invalid phone visibility');
        }
        next.phoneNumber = visibilitySettings.phoneNumber;
      }

      user.visibilitySettings = next;
    }

    await user.save();

    return success(res, 200, 'Profile updated', {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      phoneNumber: user.phoneNumber,
      bio: user.bio,
      photo: user.photo,
      visibilitySettings: user.visibilitySettings,
      communityType: user.communityType,
      notificationsEnabled: user.notificationsEnabled,
      theme: user.theme,
      language: user.language,
      role: user.role
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Change profile name with password confirmation
// @route   PUT /api/youth/profile/name
// @access  Youth
const changeFullName = async (req, res) => {
  try {
    const { newFullName, currentPassword } = req.body;

    if (!newFullName || !currentPassword) {
      return error(res, 400, 'Please provide newFullName and currentPassword');
    }

    const normalizedFullName = String(newFullName).trim();
    if (normalizedFullName.length < 2) {
      return error(res, 400, 'Name must be at least 2 characters');
    }

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    if (normalizedFullName === user.fullName) {
      return error(res, 400, 'New name cannot be the same as current name');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return error(res, 401, 'Current password is incorrect');
    }

    if (user.lastFullNameChangeAt) {
      const nextAllowedAt = new Date(user.lastFullNameChangeAt.getTime() + NAME_CHANGE_COOLDOWN_MS);
      if (nextAllowedAt > new Date()) {
        return error(
          res,
          400,
          `Name can only be changed once every 30 days. Try again on ${nextAllowedAt.toLocaleDateString()}`
        );
      }
    }

    user.fullName = normalizedFullName;
    user.lastFullNameChangeAt = new Date();
    await user.save();

    return success(res, 200, 'Name updated successfully', {
      fullName: user.fullName,
      lastFullNameChangeAt: user.lastFullNameChangeAt,
      nextAllowedNameChangeAt: new Date(user.lastFullNameChangeAt.getTime() + NAME_CHANGE_COOLDOWN_MS)
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update profile photo
// @route   PUT /api/youth/profile/photo
// @access  Youth
const updatePhoto = async (req, res) => {
  let uploadedPhoto;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    if (req.body?.photoUrl) {
      const previousPhoto = user.photo;
      user.photo = req.body.photoUrl;
      await user.save();
      await deleteImage(previousPhoto).catch((err) => {
        console.error('Failed to remove replaced MongoDB profile image:', err.message);
      });
      return success(res, 200, 'Photo updated', { photo: user.photo });
    }

    if (!req.file) return error(res, 400, 'No photo uploaded');

    const previousPhoto = user.photo;
    uploadedPhoto = await uploadImage(req.file);
    user.photo = uploadedPhoto;
    try {
      await user.save();
    } catch (err) {
      await deleteImage(uploadedPhoto).catch((cleanupError) => {
        console.error('Failed to remove unreferenced MongoDB profile image:', cleanupError.message);
      });
      throw err;
    }
    await deleteImage(previousPhoto).catch((err) => {
      console.error('Failed to remove replaced MongoDB profile image:', err.message);
    });

    return success(res, 200, 'Photo updated', { photo: user.photo });
  } catch (err) {
    console.error('Profile photo upload error:', err.message);
    return error(res, err.statusCode || 500, err.message);
  }
};

// @desc    Change password
// @route   PUT /api/youth/profile/password
// @access  Youth
const changePassword = async (req, res) => {
  try {
    const { code, newPassword, confirmNewPassword } = req.body;

    if (!code || typeof newPassword !== 'string') {
      return error(res, 400, 'Please provide the email verification code and new password');
    }

    if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
      return error(res, 400, 'New password and confirmation do not match');
    }

    if (newPassword.length < 6) {
      return error(res, 400, 'New password must be at least 6 characters');
    }

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    if (!(await verifyCode(user, 'passwordChange', code))) {
      return error(res, 400, 'Invalid or expired verification code');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return success(res, 200, 'Password changed successfully');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const requestPasswordChangeCode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    await sendCode(user, 'passwordChange');
    return success(res, 200, 'A six-digit password-change code was sent to your email address.');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Request email change verification
// @route   PUT /api/youth/profile/email/request-change
// @access  Youth
const requestEmailChange = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return error(res, 400, 'Please provide a new email');
    }

    const normalized = newEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      return error(res, 400, 'Invalid email format');
    }

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    if (user.email === normalized) {
      return error(res, 400, 'New email cannot be the same as current email');
    }

    const emailTaken = await User.findOne({ email: normalized, _id: { $ne: req.user.id } });
    if (emailTaken) {
      return error(res, 400, 'Email already in use');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.pendingEmail = normalized;
    user.emailChangeToken = tokenHash;
    user.emailChangeExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const verificationUrl = `${appUrl}/profile?verifyEmailToken=${rawToken}`;

    await sendEmail({
      to: normalized,
      subject: 'Verify your new email - FursaHub',
      text: `Verify your new email by opening this link: ${verificationUrl}`,
      html: `<p>Verify your new email by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>This link expires in 1 hour.</p>`
    });

    return success(res, 200, 'Verification link sent to your new email', {
      email: normalized,
      emailDeliveryConfigured: hasEmailConfig()
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Verify pending email change
// @route   PUT /api/youth/profile/email/verify
// @access  Youth
const verifyEmailChange = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return error(res, 400, 'Verification token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      _id: req.user.id,
      emailChangeToken: tokenHash,
      emailChangeExpires: { $gt: new Date() }
    });

    if (!user || !user.pendingEmail) {
      return error(res, 400, 'Invalid or expired verification token');
    }

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailChangeToken = undefined;
    user.emailChangeExpires = undefined;
    user.isVerified = true;
    await user.save();

    return success(res, 200, 'Email updated successfully', { email: user.email });
  } catch (err) {
    if (err.code === 11000) {
      return error(res, 400, 'Email already in use');
    }
    return error(res, 500, err.message);
  }
};

// @desc    Update notification settings
// @route   PUT /api/youth/profile/notifications
// @access  Youth
const updateNotifications = async (req, res) => {
  try {
    const { notificationsEnabled } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    user.notificationsEnabled = notificationsEnabled;
    await user.save();

    return success(res, 200, 'Notification settings updated', {
      notificationsEnabled: user.notificationsEnabled
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update theme preference
// @route   PUT /api/youth/profile/theme
// @access  Youth
const updateTheme = async (req, res) => {
  try {
    const { theme } = req.body;

    if (!['light', 'dark'].includes(theme)) {
      return error(res, 400, 'Invalid theme value');
    }

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    user.theme = theme;
    await user.save();

    return success(res, 200, 'Theme updated', { theme: user.theme });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update language preference
// @route   PUT /api/youth/profile/language
// @access  Youth
const updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;

    if (!['en', 'sw', 'fr', 'ar'].includes(language)) {
      return error(res, 400, 'Invalid language value');
    }

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    user.language = language;
    await user.save();

    return success(res, 200, 'Language updated', { language: user.language });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update category preferences
// @route   PUT /api/youth/profile/preferences
// @access  Youth
const updatePreferences = async (req, res) => {
  try {
    const { categoryPreferences } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    user.categoryPreferences = categoryPreferences;
    await user.save();

    return success(res, 200, 'Preferences updated', {
      categoryPreferences: user.categoryPreferences
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePhoto,
  requestPasswordChangeCode,
  changePassword,
  changeFullName,
  requestEmailChange,
  verifyEmailChange,
  updateNotifications,
  updateTheme,
  updateLanguage,
  updatePreferences
};
