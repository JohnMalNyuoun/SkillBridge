const router = require('express').Router();
const c = require('../controllers/story.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');

router.head('/', optionalAuth, c.headList);
router.get('/', optionalAuth, c.list);
router.get('/mine', verifyToken, c.listMine);
router.head('/:id', optionalAuth, c.headOne);
router.get('/:id', optionalAuth, c.getById);
router.post('/', verifyToken, c.create);
router.patch('/:id', verifyToken, c.update);
router.put('/:id', verifyToken, c.replace);
router.delete('/:id', verifyToken, c.remove);
router.post('/:id/like', verifyToken, c.toggleLike);
router.post('/:id/comments', verifyToken, c.addComment);
router.delete('/:id/comments/:commentId', verifyToken, c.removeComment);

module.exports = router;
