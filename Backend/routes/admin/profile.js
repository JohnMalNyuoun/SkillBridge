const express = require('express');
const router = express.Router();
const { getProfile, removePhoto, updatePhoto } = require('../../controllers/admin/profile');
const { protect } = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/isAdmin');
const { uploadProfile } = require('../../middleware/upload');

router.get('/', protect, isAdmin, getProfile);
router.put('/photo', protect, isAdmin, uploadProfile.single('photo'), updatePhoto);
router.delete('/photo', protect, isAdmin, removePhoto);

module.exports = router;
