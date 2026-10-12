// routes/youth/outcomes.js
const express = require('express');
const router = express.Router();
const {
  getPendingOutcomes,
  submitOutcome
} = require('../../controllers/youth/outcome');
const { protect } = require('../../middleware/auth');
const { isYouth } = require('../../middleware/isYouth');

router.get('/', protect, isYouth, getPendingOutcomes);
router.post('/:applicationId', protect, isYouth, submitOutcome);

module.exports = router;
