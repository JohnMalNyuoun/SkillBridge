const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updateLogo,
  requestPasswordChangeCode,
  changePassword,
  updateNotifications,
  updateLanguage
} = require('../../controllers/organisation/profile');
const { protect } = require('../../middleware/auth');
const { isOrganisation } = require('../../middleware/isOrganisation');
const { uploadLogo } = require('../../middleware/upload');

router.get('/', protect, isOrganisation, getProfile);
router.put('/', protect, isOrganisation, updateProfile);
router.put('/logo', protect, isOrganisation, uploadLogo.single('logo'), updateLogo);
router.post('/password/request-code', protect, isOrganisation, requestPasswordChangeCode);
router.put('/password', protect, isOrganisation, changePassword);
router.put('/notifications', protect, isOrganisation, updateNotifications);
router.put('/language', protect, isOrganisation, updateLanguage);

module.exports = router;
