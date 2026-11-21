const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  getActiveCourseCall,
  getCallSession,
  endCallSession,
  acceptCallSession,
  declineCallSession
} = require('../controllers/courseCalls');
const { protect } = require('../middleware/auth');

const router = express.Router();
const invitationActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many call invitation actions. Please try again later.' }
});

router.get('/course/:courseId/active', protect, getActiveCourseCall);
router.get('/:id', protect, getCallSession);
router.post('/:id/end', protect, endCallSession);
router.post('/:id/accept', protect, invitationActionLimiter, acceptCallSession);
router.post('/:id/decline', protect, invitationActionLimiter, declineCallSession);

module.exports = router;
