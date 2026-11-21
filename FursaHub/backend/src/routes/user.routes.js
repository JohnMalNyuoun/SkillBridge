const router = require('express').Router();
const c = require('../controllers/user.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

router.get('/me/settings', verifyToken, c.getSettings);
router.patch('/me/settings', verifyToken, c.updateSettings);

router.get('/directory', optionalAuth, c.directory);
router.get('/:id/profile', optionalAuth, c.getPublicProfile);

router.get('/', verifyToken, isAdmin, c.list);
router.get('/:id', verifyToken, c.getById);
router.patch('/:id', verifyToken, c.updateProfile);
router.delete('/:id', verifyToken, isAdmin, c.deactivate);

module.exports = router;
