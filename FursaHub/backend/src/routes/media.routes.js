const router = require('express').Router();
const c = require('../controllers/media.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/upload', verifyToken, c.uploadMiddleware, c.upload);
router.get('/mine', verifyToken, c.listMine);
router.delete('/:id', verifyToken, c.remove);

module.exports = router;
