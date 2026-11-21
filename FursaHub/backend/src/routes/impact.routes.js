const router = require('express').Router();
const c = require('../controllers/impact.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

router.post('/', verifyToken, c.create);
router.get('/summary', verifyToken, isAdmin, c.summary);
router.get('/', verifyToken, isAdmin, c.list);
router.get('/student/:studentId', verifyToken, c.listForStudent);
router.get('/me', verifyToken, c.listForStudent);
router.post('/:id/verify', verifyToken, isAdmin, c.verify);

module.exports = router;
