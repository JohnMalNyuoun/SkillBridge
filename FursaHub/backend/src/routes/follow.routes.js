const router = require('express').Router();
const c = require('../controllers/follow.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');

router.post('/:targetId', verifyToken, c.follow);
router.delete('/:targetId', verifyToken, c.unfollow);
router.get('/status/:targetId', verifyToken, c.status);
router.get('/counts/:userId', optionalAuth, c.counts);
router.get('/following/:userId?', verifyToken, c.listFollowing);
router.get('/followers/:userId?', verifyToken, c.listFollowers);

module.exports = router;
