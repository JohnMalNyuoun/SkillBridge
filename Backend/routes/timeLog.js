const express = require('express');
const router = express.Router();
const timeLogController = require('../controllers/timeLog');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/isAdmin');

// Public routes (for logging login/logout)
router.post('/login', timeLogController.logLogin);
router.post('/logout', timeLogController.logLogout);

// Protected routes (require authentication)
router.get('/user/:userId', protect, timeLogController.getUserTimeLogs);
router.get('/user/:userId/analytics', protect, timeLogController.getUserAnalytics);

// Admin only routes
router.get('/all', protect, isAdmin, timeLogController.getAllTimeLogs);
router.get('/platform/analytics', protect, isAdmin, timeLogController.getPlatformAnalytics);
router.get('/active-sessions', protect, isAdmin, timeLogController.getActiveSessions);
router.delete('/:id', protect, isAdmin, timeLogController.deleteTimeLog);

module.exports = router;
