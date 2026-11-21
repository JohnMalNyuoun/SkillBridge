const router = require('express').Router();
const c = require('../controllers/opportunity.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

router.get('/', optionalAuth, c.list);
router.get('/:id', optionalAuth, c.getById);
router.post('/', verifyToken, isAdmin, c.create);
router.patch('/:id', verifyToken, isAdmin, c.update);
router.delete('/:id', verifyToken, isAdmin, c.remove);

module.exports = router;
