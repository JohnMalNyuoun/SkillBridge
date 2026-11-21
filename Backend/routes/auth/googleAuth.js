const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { createGoogleAuthHandler } = require('../../controllers/auth/googleAuth');

const router = express.Router();
const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many Google sign-in attempts. Please try again later.'
  }
});

router.post('/', googleAuthLimiter, createGoogleAuthHandler());

module.exports = router;
