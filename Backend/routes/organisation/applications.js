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

router.get('/', protect, isOrganisation, getOrgApplications);
router.get('/:id', protect, isOrganisation, getOrgApplication);
router.put('/:id/shortlist', protect, isOrganisation, shortlistApplicant);
router.put('/:id/accept', protect, isOrganisation, acceptApplicant);
router.put('/:id/reject', protect, isOrganisation, rejectApplicant);

module.exports = router;