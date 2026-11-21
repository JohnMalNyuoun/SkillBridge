const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { protect } = require('../../middleware/auth');
const {
  refreshSession,
  migrateSession,
  logoutSession
} = require('../../controllers/auth/session');

const router = express.Router();
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many session refresh attempts. Please try again later.' }
});
const migrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many session migration attempts. Please try again later.' }
});
const logoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/refresh', refreshLimiter, refreshSession);
router.post('/migrate', migrationLimiter, protect, migrateSession);
router.post('/logout', logoutLimiter, logoutSession);

module.exports = router;
