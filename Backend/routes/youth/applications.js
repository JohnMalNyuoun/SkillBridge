const express = require('express');
const router = express.Router();
const {
  applyForCourse,
  getMyApplications,
  withdrawApplication
} = require('../../controllers/youth/applications');
const { protect } = require('../../middleware/auth');
const { isYouth } = require('../../middleware/isYouth');

router.post('/:courseId', protect, isYouth, applyForCourse);
router.get('/', protect, isYouth, getMyApplications);
router.put('/:id/withdraw', protect, isYouth, withdrawApplication);

module.exports = router;