const router = require('express').Router();
const c = require('../controllers/application.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin, isStudent } = require('../middleware/role.middleware');

router.post('/', verifyToken, isStudent, c.apply);
router.get('/mine', verifyToken, isStudent, c.listMine);
router.get('/opportunity/:opportunityId', verifyToken, isAdmin, c.listForOpportunity);
router.patch('/:id/status', verifyToken, isAdmin, c.updateStatus);
router.post('/:id/withdraw', verifyToken, isStudent, c.withdraw);

module.exports = router;
