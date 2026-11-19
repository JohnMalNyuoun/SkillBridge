const express = require('express');
const {
  getActiveCourseCall,
  getCallSession,
  endCallSession,
  declineCallSession
} = require('../controllers/courseCalls');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/course/:courseId/active', protect, getActiveCourseCall);
router.get('/:id', protect, getCallSession);
router.post('/:id/end', protect, endCallSession);
router.post('/:id/decline', protect, declineCallSession);

module.exports = router;
