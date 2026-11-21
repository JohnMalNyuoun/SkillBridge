const router = require('express').Router();
const c = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/register', c.register);
router.post('/login', c.login);
router.get('/me', verifyToken, c.me);

module.exports = router;
