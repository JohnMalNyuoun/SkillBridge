const express = require('express');
const {
  getCallSession,
  endCallSession,
  declineCallSession
} = require('../controllers/courseCalls');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', protect, getCallSession);
router.post('/:id/end', protect, endCallSession);
router.post('/:id/decline', protect, declineCallSession);

module.exports = router;
