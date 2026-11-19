const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPublicChatMemberProfile,
  getPublicYouthProfile,
  getPublicOrganisationProfile
} = require('../controllers/common/profiles');

router.get('/member/:id', protect, getPublicChatMemberProfile);
router.get('/youth/:id', protect, getPublicYouthProfile);
router.get('/organisation/:id', protect, getPublicOrganisationProfile);

module.exports = router;
