const express = require('express');
const router = express.Router();
const {
  getOrgApplications,
  getOrgApplication,
  shortlistApplicant,
  acceptApplicant,
  rejectApplicant
} = require('../../controllers/organisation/applications');
const { protect } = require('../../middleware/auth');
const { isOrganisation } = require('../../middleware/isOrganisation');
const { isOrgApplicantReviewer } = require('../../middleware/isOrgApplicantReviewer');

router.get('/', protect, isOrgApplicantReviewer, getOrgApplications);
router.get('/:id', protect, isOrgApplicantReviewer, getOrgApplication);
router.put('/:id/shortlist', protect, isOrganisation, shortlistApplicant);
router.put('/:id/accept', protect, isOrgApplicantReviewer, acceptApplicant);
router.put('/:id/reject', protect, isOrgApplicantReviewer, rejectApplicant);

module.exports = router;