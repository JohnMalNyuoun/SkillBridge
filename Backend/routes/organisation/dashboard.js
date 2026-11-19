const express = require('express');
const {
  getOrgDashboard,
  createOrgMember,
  updateOrgMember
} = require('../../controllers/organisation/dashboard');
const { protect } = require('../../middleware/auth');
const { isOrgAdmin } = require('../../middleware/isOrgAdmin');

const router = express.Router();

router.get('/dashboard', protect, isOrgAdmin, getOrgDashboard);
router.post('/create-member', protect, isOrgAdmin, createOrgMember);
router.patch('/member/:id', protect, isOrgAdmin, updateOrgMember);

module.exports = router;
