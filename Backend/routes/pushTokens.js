const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const { registerPushToken, removePushToken } = require('../controllers/pushTokens');

const router = express.Router();
const pushTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many push-token requests. Please try again later.' }
});

router.post('/', protect, pushTokenLimiter, registerPushToken);
router.delete('/', protect, pushTokenLimiter, removePushToken);

module.exports = router;
