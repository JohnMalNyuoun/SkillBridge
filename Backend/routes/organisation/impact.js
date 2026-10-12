// routes/organisation/impact.js
const express = require('express');
const router = express.Router();
const {
  addOutcomeQuestions,
  markCompletion,
  getImpactDashboard,
  getCourseOutcomes
} = require('../../controllers/organisation/impact');
const { protect } = require('../../middleware/auth');
const { isOrganisation } = require('../../middleware/isOrganisation');

router.get('/dashboard', protect, isOrganisation, getImpactDashboard);
router.post('/courses/:id/outcome-questions', protect, isOrganisation, addOutcomeQuestions);
router.put('/applications/:id/completion', protect, isOrganisation, markCompletion);
router.get('/courses/:id/outcomes', protect, isOrganisation, getCourseOutcomes);

module.exports = router;