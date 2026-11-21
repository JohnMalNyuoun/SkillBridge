const router = require('express').Router();
const c = require('../controllers/export.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

router.get('/impact.csv', verifyToken, isAdmin, c.impactCsv);
router.get('/impact.pdf', verifyToken, isAdmin, c.impactPdf);

module.exports = router;
