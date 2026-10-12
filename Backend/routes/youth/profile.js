const express = require('express');
const router = express.Router();
const {
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
} = require('../../controllers/youth/profile');
const { protect } = require('../../middleware/auth');
const { isYouth } = require('../../middleware/isYouth');
const { uploadProfile } = require('../../middleware/upload');

router.get('/', protect, isYouth, getProfile);
router.put('/', protect, isYouth, updateProfile);
router.put('/photo', protect, isYouth, uploadProfile.single('photo'), updatePhoto);
router.post('/password/request-code', protect, isYouth, requestPasswordChangeCode);
router.put('/password', protect, isYouth, changePassword);
router.put('/name', protect, isYouth, changeFullName);
router.put('/email/request-change', protect, isYouth, requestEmailChange);
router.put('/email/verify', protect, isYouth, verifyEmailChange);
router.put('/notifications', protect, isYouth, updateNotifications);
router.put('/theme', protect, isYouth, updateTheme);
router.put('/language', protect, isYouth, updateLanguage);
router.put('/preferences', protect, isYouth, updatePreferences);

module.exports = router;
