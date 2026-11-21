const router = require('express').Router();
const c = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, c.list);
router.patch('/read-all', verifyToken, c.markAllRead);
router.patch('/:id/read', verifyToken, c.markRead);
router.delete('/:id', verifyToken, c.remove);

module.exports = router;
