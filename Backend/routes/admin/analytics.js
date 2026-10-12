const express = require('express');
const router = express.Router();
const { getUserAnalytics, getModerationAnalytics } = require('../../controllers/admin/analytics');
const { getPostHogAnalytics } = require('../../controllers/admin/posthogAnalytics');
const { protect } = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/isAdmin');

router.get('/users', protect, isAdmin, getUserAnalytics);
router.get('/moderation', protect, isAdmin, getModerationAnalytics);
router.get('/posthog', protect, isAdmin, getPostHogAnalytics);

module.exports = router;
