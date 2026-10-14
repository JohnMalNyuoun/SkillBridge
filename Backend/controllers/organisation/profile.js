const bcrypt = require('bcryptjs');
const Organisation = require('../../models/Organisation');
const { success, error } = require('../../utils/apiResponse');
const { deleteImage, uploadImage } = require('../../services/mongodbImageService');
const { sendCode, verifyCode } = require('../../services/verificationCodeService');

// @desc    Get org profile
// @route   GET /api/org/profile
// @access  Organisation
const getProfile = async (req, res) => {
  try {
    const org = await Organisation.findById(req.user.id).select('-password');
    if (!org) return error(res, 404, 'Organisation not found');
    return success(res, 200, 'Profile fetched', org);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update org profile
// @route   PUT /api/org/profile
// @access  Organisation
const updateProfile = async (req, res) => {
  try {
    const { name, description, bio, phoneNumber, location, website } = req.body;

    const org = await Organisation.findById(req.user.id);
    if (!org) return error(res, 404, 'Organisation not found');

    if (name !== undefined) {
      const nextName = String(name).trim();
      if (!nextName) {
        return error(res, 400, 'Organisation name is required');
      }
      org.name = nextName;
    }

    if (description !== undefined) org.description = String(description).trim();
    if (bio !== undefined) org.bio = String(bio).trim();
    if (phoneNumber !== undefined) org.phoneNumber = String(phoneNumber).trim();
    if (location !== undefined) org.location = String(location).trim();
    if (website !== undefined) org.website = String(website).trim();

    await org.save();

    return success(res, 200, 'Profile updated', {
      id: org._id,
      name: org.name,
      email: org.email,
      description: org.description,
      bio: org.bio,
      phoneNumber: org.phoneNumber,
      location: org.location,
      website: org.website,
      logo: org.logo,
      type: org.type,
      status: org.status,
      language: org.language,
      role: org.role
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update org logo
// @route   PUT /api/org/profile/logo
// @access  Organisation
const updateLogo = async (req, res) => {
  let uploadedLogo;
  try {
    const org = await Organisation.findById(req.user.id);
    if (!org) return error(res, 404, 'Organisation not found');

    if (req.body?.logoUrl !== undefined) {
      const logoUrl = String(req.body.logoUrl).trim();
      if (!logoUrl) return error(res, 400, 'Invalid logo URL');

      const previousLogo = org.logo;
      org.logo = logoUrl;
      await org.save();
      await deleteImage(previousLogo).catch((err) => {
        console.error('Failed to remove replaced MongoDB organisation logo:', err.message);
      });
      return success(res, 200, 'Logo updated', { logo: org.logo });
    }

    if (!req.file) return error(res, 400, 'No logo uploaded');

    const previousLogo = org.logo;
    uploadedLogo = await uploadImage(req.file);
    org.logo = uploadedLogo;
    try {
      await org.save();
    } catch (err) {
      await deleteImage(uploadedLogo).catch((cleanupError) => {
        console.error('Failed to remove unreferenced MongoDB organisation logo:', cleanupError.message);
      });
      throw err;
    }
    await deleteImage(previousLogo).catch((err) => {
      console.error('Failed to remove replaced MongoDB organisation logo:', err.message);
    });

    return success(res, 200, 'Logo updated', { logo: org.logo });
  } catch (err) {
    console.error('Organisation logo upload error:', err.message);
    return error(res, err.statusCode || 500, err.message || 'Failed to upload logo');
  }
};

// @desc    Change org password
// @route   PUT /api/org/profile/password
// @access  Organisation
const changePassword = async (req, res) => {
  try {
    const { code, newPassword, confirmNewPassword } = req.body;

    if (!code || typeof newPassword !== 'string') {
      return error(res, 400, 'Please provide the email verification code and new password');
    }

    if (newPassword.length < 6) {
      return error(res, 400, 'New password must be at least 6 characters');
    }
    if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
      return error(res, 400, 'New password and confirmation do not match');
    }

    const org = await Organisation.findById(req.user.id);
    if (!org) return error(res, 404, 'Organisation not found');

    if (!(await verifyCode(org, 'passwordChange', code))) {
      return error(res, 400, 'Invalid or expired verification code');
    }

    const salt = await bcrypt.genSalt(10);
    org.password = await bcrypt.hash(newPassword, salt);
    await org.save();

    return success(res, 200, 'Password changed successfully');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const requestPasswordChangeCode = async (req, res) => {
  try {
    const org = await Organisation.findById(req.user.id);
    if (!org) return error(res, 404, 'Organisation not found');

    await sendCode(org, 'passwordChange');
    return success(res, 200, 'A six-digit password-change code was sent to your email address.');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update notification settings
// @route   PUT /api/org/profile/notifications
// @access  Organisation
const updateNotifications = async (req, res) => {
  try {
    const { notificationsEnabled } = req.body;

    const org = await Organisation.findById(req.user.id);
    if (!org) return error(res, 404, 'Organisation not found');

    org.notificationsEnabled = notificationsEnabled;
    await org.save();

    return success(res, 200, 'Notification settings updated', {
      notificationsEnabled: org.notificationsEnabled
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Update language preference
// @route   PUT /api/org/profile/language
// @access  Organisation
const updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;

    if (!['en', 'sw', 'fr', 'ar'].includes(language)) {
      return error(res, 400, 'Invalid language value');
    }

    const org = await Organisation.findById(req.user.id);
    if (!org) return error(res, 404, 'Organisation not found');

    org.language = language;
    await org.save();

    return success(res, 200, 'Language updated', { language: org.language });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateLogo,
  requestPasswordChangeCode,
  changePassword,
  updateNotifications,
  updateLanguage
};
