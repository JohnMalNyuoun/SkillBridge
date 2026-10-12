const express = require('express');
const router = express.Router();
const {
  verifyRegistrationEmail,
  resendRegistrationCode,
  requestPasswordReset,
  resetPassword
} = require('../../controllers/auth/verification');

router.post('/email/verify-registration', verifyRegistrationEmail);
router.post('/email/resend-registration', resendRegistrationCode);
router.post('/password/forgot', requestPasswordReset);
router.post('/password/reset', resetPassword);

module.exports = router;
