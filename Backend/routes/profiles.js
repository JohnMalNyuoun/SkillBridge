const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPublicYouthProfile,
  getPublicOrganisationProfile
} = require('../controllers/common/profiles');

router.get('/youth/:id', protect, getPublicYouthProfile);
router.get('/organisation/:id', protect, getPublicOrganisationProfile);

module.exports = router;
