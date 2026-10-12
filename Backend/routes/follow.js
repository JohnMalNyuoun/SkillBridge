const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  followTarget,
  unfollowTarget,
  checkFollowStatus,
  getFollowCount,
  getFollowers,
  getFollowing
} = require('../controllers/common/follow');

// Protected routes (require authentication)
router.post('/:targetId/:targetModel', protect, followTarget);
router.delete('/:targetId/:targetModel', protect, unfollowTarget);
router.get('/status/:targetId/:targetModel', protect, checkFollowStatus);

// Public routes
router.get('/count/:targetId/:targetModel', getFollowCount);
router.get('/followers/:targetId/:targetModel', getFollowers);
router.get('/following/:userId', getFollowing);

module.exports = router;
