const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/public.controller');

const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions. Please try again later.' },
});

router.get('/stats', c.getStats);
router.post('/subscribe', writeLimiter, c.subscribe);
router.post('/contact', writeLimiter, c.contact);

module.exports = router;
